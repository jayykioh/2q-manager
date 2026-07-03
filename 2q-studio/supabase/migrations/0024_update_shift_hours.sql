-- Update morning shift to 10:00 - 18:00 (10am - 6pm)
UPDATE public.shift_config 
SET start_time = '10:00:00', end_time = '18:00:00', hours = 8.0 
WHERE shift_type = 'morning';

-- Update afternoon shift to 12:00 - 20:00 (12pm - 8pm)
UPDATE public.shift_config 
SET start_time = '12:00:00', end_time = '20:00:00', hours = 8.0 
WHERE shift_type = 'afternoon';

-- Update full_day shift to 10:00 - 20:00 (10am - 8pm)
UPDATE public.shift_config 
SET start_time = '10:00:00', end_time = '20:00:00', hours = 10.0 
WHERE shift_type = 'full_day';
