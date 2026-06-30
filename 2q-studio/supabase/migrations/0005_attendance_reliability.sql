-- 0005_attendance_reliability.sql
-- Make shift registration deployment-safe and expose a privacy-safe team calendar.

-- Existing single-store installs predate explicit staff-store assignment. Backfill
-- only when there is exactly one active store, so multi-store installs stay explicit.
WITH only_store AS (
  SELECT (array_agg(id))[1] AS id
  FROM public.stores
  WHERE is_active = TRUE
  HAVING COUNT(*) = 1
)
INSERT INTO public.staff_stores (staff_id, store_id, is_primary)
SELECT
  profile.id,
  only_store.id,
  NOT EXISTS (
    SELECT 1
    FROM public.staff_stores existing_primary
    WHERE existing_primary.staff_id = profile.id
      AND existing_primary.is_primary = TRUE
  )
FROM public.profiles profile
CROSS JOIN only_store
WHERE profile.is_active = TRUE
ON CONFLICT (staff_id, store_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_attendance_calendar(
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
  has_checked_out BOOLEAN
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
    attendance.check_out IS NOT NULL
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

  INSERT INTO public.attendance (staff_id, store_id, shift_type, shift_date)
  VALUES (v_user_id, p_store_id, p_shift_type, p_shift_date)
  ON CONFLICT (staff_id, store_id, shift_date, shift_type)
  DO UPDATE SET staff_id = EXCLUDED.staff_id
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_shift(
  p_store_id UUID,
  p_shift_type public.shift_type,
  p_shift_date DATE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_is_active BOOLEAN;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
BEGIN
  SELECT profile.is_active
  INTO v_is_active
  FROM public.profiles profile
  WHERE profile.id = v_user_id;

  IF v_user_id IS NULL OR v_is_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  IF p_shift_date IS NULL OR p_shift_date < v_today THEN
    RAISE EXCEPTION 'SHIFT_DATE_IN_PAST';
  END IF;

  DELETE FROM public.attendance attendance
  WHERE attendance.staff_id = v_user_id
    AND attendance.store_id = p_store_id
    AND attendance.shift_date = p_shift_date
    AND attendance.shift_type = p_shift_type
    AND attendance.check_in IS NULL;
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
  v_attendance_id UUID;
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
    staff_id, store_id, shift_type, shift_date, check_in
  ) VALUES (
    v_user_id, p_store_id, p_shift_type, v_business_date, NOW()
  )
  ON CONFLICT (staff_id, store_id, shift_date, shift_type)
  DO UPDATE SET check_in = COALESCE(public.attendance.check_in, NOW())
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_out(p_attendance_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_record public.attendance%ROWTYPE;
  v_hours_worked NUMERIC;
  v_hourly_rate NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT *
  INTO v_record
  FROM public.attendance attendance
  WHERE attendance.id = p_attendance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_NOT_FOUND';
  END IF;

  IF v_record.staff_id <> v_user_id THEN
    RAISE EXCEPTION 'ATTENDANCE_FORBIDDEN';
  END IF;

  IF v_record.check_in IS NULL THEN
    RAISE EXCEPTION 'SHIFT_NOT_STARTED';
  END IF;

  IF v_record.check_out IS NOT NULL THEN
    RAISE EXCEPTION 'SHIFT_ALREADY_ENDED';
  END IF;

  SELECT profile.hourly_rate
  INTO v_hourly_rate
  FROM public.profiles profile
  WHERE profile.id = v_user_id
    AND profile.is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_INACTIVE';
  END IF;

  v_hours_worked := EXTRACT(EPOCH FROM (NOW() - v_record.check_in)) / 3600;

  UPDATE public.attendance attendance
  SET check_out = NOW(),
      hours_worked = ROUND(v_hours_worked, 2),
      base_pay = ROUND(v_hours_worked * COALESCE(v_hourly_rate, 0), 0)
  WHERE attendance.id = p_attendance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_calendar(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_shift(UUID, public.shift_type, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unassign_shift(UUID, public.shift_type, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clock_in(UUID, public.shift_type) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clock_out(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_attendance_calendar(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_shift(UUID, public.shift_type, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_shift(UUID, public.shift_type, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_in(UUID, public.shift_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out(UUID) TO authenticated;
