-- 0006_attendance_approval.sql
-- Weekly approval workflow: staff schedules stay pending until an admin approves
-- them during the seven-day window before the shift. Admin schedules auto-approve.

CREATE OR REPLACE FUNCTION private.assign_single_store_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT (array_agg(store.id))[1]
  INTO v_store_id
  FROM public.stores store
  WHERE store.is_active = TRUE
  HAVING COUNT(*) = 1;

  IF v_store_id IS NOT NULL THEN
    INSERT INTO public.staff_stores (staff_id, store_id, is_primary)
    VALUES (NEW.id, v_store_id, TRUE)
    ON CONFLICT (staff_id, store_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_single_store_to_profile ON public.profiles;
CREATE TRIGGER trg_assign_single_store_to_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.assign_single_store_to_profile();

REVOKE ALL ON FUNCTION private.assign_single_store_to_profile() FROM PUBLIC, anon, authenticated;

UPDATE public.attendance attendance
SET approved_by = attendance.staff_id,
    approved_at = COALESCE(attendance.approved_at, attendance.created_at)
FROM public.profiles profile
WHERE profile.id = attendance.staff_id
  AND profile.role = 'admin'
  AND attendance.approved_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_attendance_calendar_v2(
  p_store_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  attendance_id UUID,
  staff_id UUID,
  full_name TEXT,
  role TEXT,
  shift_date DATE,
  shift_type public.shift_type,
  has_checked_in BOOLEAN,
  has_checked_out BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_role public.user_role;
BEGIN
  SELECT profile.role
  INTO v_role
  FROM public.profiles profile
  WHERE profile.id = v_user_id
    AND profile.is_active = TRUE;

  IF v_user_id IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  IF p_start_date IS NULL
     OR p_end_date IS NULL
     OR p_end_date < p_start_date
     OR (p_end_date - p_start_date) > 62 THEN
    RAISE EXCEPTION 'INVALID_DATE_RANGE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores store
    WHERE store.id = p_store_id
      AND store.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND';
  END IF;

  IF v_role <> 'admin' AND NOT EXISTS (
    SELECT 1
    FROM public.staff_stores membership
    WHERE membership.staff_id = v_user_id
      AND membership.store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'STORE_FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    attendance.id,
    attendance.staff_id,
    profile.full_name,
    profile.role::TEXT,
    attendance.shift_date,
    attendance.shift_type,
    attendance.check_in IS NOT NULL,
    attendance.check_out IS NOT NULL,
    attendance.approved_by,
    attendance.approved_at
  FROM public.attendance attendance
  JOIN public.profiles profile ON profile.id = attendance.staff_id
  WHERE attendance.store_id = p_store_id
    AND attendance.shift_date BETWEEN p_start_date AND p_end_date
    AND profile.is_active = TRUE
  ORDER BY attendance.shift_date, profile.full_name, attendance.shift_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_shift(
  p_store_id UUID,
  p_shift_type public.shift_type,
  p_shift_date DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_role public.user_role;
  v_attendance_id UUID;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
BEGIN
  SELECT profile.role
  INTO v_role
  FROM public.profiles profile
  WHERE profile.id = v_user_id
    AND profile.is_active = TRUE;

  IF v_user_id IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  IF p_shift_date IS NULL OR p_shift_date < v_today THEN
    RAISE EXCEPTION 'SHIFT_DATE_IN_PAST';
  END IF;

  IF v_role <> 'admin' AND NOT EXISTS (
    SELECT 1
    FROM public.staff_stores membership
    WHERE membership.staff_id = v_user_id
      AND membership.store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'STORE_FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.shift_config config
    JOIN public.stores store ON store.id = config.store_id
    WHERE config.store_id = p_store_id
      AND config.shift_type = p_shift_type
      AND config.is_active = TRUE
      AND store.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'SHIFT_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.attendance (
    staff_id,
    store_id,
    shift_type,
    shift_date,
    approved_by,
    approved_at
  ) VALUES (
    v_user_id,
    p_store_id,
    p_shift_type,
    p_shift_date,
    CASE WHEN v_role = 'admin' THEN v_user_id ELSE NULL END,
    CASE WHEN v_role = 'admin' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (staff_id, store_id, shift_date, shift_type)
  DO UPDATE SET staff_id = EXCLUDED.staff_id
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_shift(p_attendance_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_role public.user_role;
  v_record public.attendance%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
BEGIN
  SELECT profile.role
  INTO v_role
  FROM public.profiles profile
  WHERE profile.id = v_user_id
    AND profile.is_active = TRUE;

  IF v_user_id IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  SELECT *
  INTO v_record
  FROM public.attendance attendance
  WHERE attendance.id = p_attendance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_NOT_FOUND';
  END IF;

  IF v_record.shift_date < v_today
     OR v_record.shift_date > (v_today + 7) THEN
    RAISE EXCEPTION 'APPROVAL_WINDOW_NOT_OPEN';
  END IF;

  IF v_record.check_in IS NOT NULL THEN
    RAISE EXCEPTION 'SHIFT_ALREADY_STARTED';
  END IF;

  UPDATE public.attendance attendance
  SET approved_by = v_user_id,
      approved_at = NOW()
  WHERE attendance.id = p_attendance_id
    AND attendance.approved_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_in(
  p_store_id UUID,
  p_shift_type public.shift_type
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_role public.user_role;
  v_business_date DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
  v_attendance public.attendance%ROWTYPE;
BEGIN
  SELECT profile.role
  INTO v_role
  FROM public.profiles profile
  WHERE profile.id = v_user_id
    AND profile.is_active = TRUE;

  IF v_user_id IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  IF v_role <> 'admin' AND NOT EXISTS (
    SELECT 1
    FROM public.staff_stores membership
    WHERE membership.staff_id = v_user_id
      AND membership.store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'STORE_FORBIDDEN';
  END IF;

  SELECT *
  INTO v_attendance
  FROM public.attendance attendance
  WHERE attendance.staff_id = v_user_id
    AND attendance.store_id = p_store_id
    AND attendance.shift_date = v_business_date
    AND attendance.shift_type = p_shift_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_REGISTERED';
  END IF;

  IF v_attendance.approved_at IS NULL THEN
    RAISE EXCEPTION 'SHIFT_NOT_APPROVED';
  END IF;

  UPDATE public.attendance attendance
  SET check_in = COALESCE(attendance.check_in, NOW())
  WHERE attendance.id = v_attendance.id
  RETURNING * INTO v_attendance;

  RETURN v_attendance.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_calendar_v2(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_shift(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_attendance_calendar_v2(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_shift(UUID) TO authenticated;
