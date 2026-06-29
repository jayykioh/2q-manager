-- 0004_attendance_calendar.sql: Update clock_in to UPSERT and add assign/unassign shift RPCs

-- Fix clock_in to handle upsert correctly
CREATE OR REPLACE FUNCTION clock_in(p_store_id UUID, p_shift_type public.shift_type) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_business_date DATE;
  v_attendance_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_business_date := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;

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

-- New function to assign shift
CREATE OR REPLACE FUNCTION assign_shift(p_store_id UUID, p_shift_type public.shift_type, p_shift_date DATE) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_attendance_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.attendance (
    staff_id, store_id, shift_type, shift_date
  ) VALUES (
    v_user_id, p_store_id, p_shift_type, p_shift_date
  ) 
  ON CONFLICT (staff_id, store_id, shift_date, shift_type) 
  DO NOTHING
  RETURNING id INTO v_attendance_id;

  -- If it already exists, just return the existing ID
  IF v_attendance_id IS NULL THEN
    SELECT id INTO v_attendance_id FROM public.attendance 
    WHERE staff_id = v_user_id AND store_id = p_store_id AND shift_date = p_shift_date AND shift_type = p_shift_type;
  END IF;

  RETURN v_attendance_id;
END;
$$;

-- New function to unassign shift
CREATE OR REPLACE FUNCTION unassign_shift(p_store_id UUID, p_shift_type public.shift_type, p_shift_date DATE) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.attendance 
  WHERE staff_id = v_user_id 
    AND store_id = p_store_id 
    AND shift_date = p_shift_date 
    AND shift_type = p_shift_type
    AND check_in IS NULL; -- Only delete if not clocked in
END;
$$;
