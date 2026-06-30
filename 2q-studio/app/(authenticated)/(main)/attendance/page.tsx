"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { createClient } from "@/lib/supabase/client";

type ShiftType = "morning" | "afternoon" | "full_day" | "custom";
type UserRole = "admin" | "staff";

type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  hourly_rate: number | string;
};

type PersonalAttendance = {
  id: string;
  staff_id: string;
  shift_date: string;
  shift_type: ShiftType;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | string | null;
  base_pay: number | string | null;
  bonus: number | string | null;
  approved_by: string | null;
  approved_at: string | null;
};

type CalendarAssignment = {
  attendance_id: string;
  staff_id: string;
  full_name: string;
  role: UserRole;
  shift_date: string;
  shift_type: ShiftType;
  has_checked_in: boolean;
  has_checked_out: boolean;
  approved_by: string | null;
  approved_at: string | null;
};

type PersonColor = {
  marker: string;
  border: string;
};

const supabase = createClient();
const STORE_ID = "11111111-1111-1111-1111-111111111111";

const PERSON_COLORS: PersonColor[] = [
  { marker: "bg-emerald-700 text-white", border: "border-emerald-700" },
  { marker: "bg-red-700 text-white", border: "border-red-700" },
  { marker: "bg-blue-700 text-white", border: "border-blue-700" },
  { marker: "bg-amber-600 text-black", border: "border-amber-600" },
  { marker: "bg-purple-700 text-white", border: "border-purple-700" },
  { marker: "bg-cyan-700 text-white", border: "border-cyan-700" },
  { marker: "bg-pink-700 text-white", border: "border-pink-700" },
  { marker: "bg-orange-700 text-white", border: "border-orange-700" },
];

const SHIFT_DETAILS: Array<{
  type: "morning" | "afternoon";
  title: string;
  registrationLabel: string;
  time: string;
}> = [
  { type: "morning", title: "Ca Sáng", registrationLabel: "Đăng ký Sáng", time: "09:00 - 15:00" },
  { type: "afternoon", title: "Ca Chiều", registrationLabel: "Đăng ký Chiều", time: "15:00 - 21:00" },
];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthBounds(date: Date) {
  return {
    start: formatDateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: formatDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getShiftLabel(shiftType: ShiftType) {
  if (shiftType === "morning") return "Ca Sáng";
  if (shiftType === "afternoon") return "Ca Chiều";
  if (shiftType === "full_day") return "Cả ngày";
  return "Ca tùy chỉnh";
}

function getAttendanceError(message: string) {
  if (message.includes("SHIFT_DATE_IN_PAST")) return "Không thể thay đổi lịch của ngày đã qua.";
  if (message.includes("SHIFT_NOT_AVAILABLE")) return "Ca này chưa được cấu hình hoặc đang tạm khóa.";
  if (message.includes("SHIFT_NOT_REGISTERED")) return "Bạn chưa đăng ký ca này trong lịch làm việc.";
  if (message.includes("SHIFT_NOT_APPROVED")) return "Ca này đang chờ admin duyệt.";
  if (message.includes("APPROVAL_WINDOW_NOT_OPEN")) return "Admin chỉ có thể duyệt ca trong vòng 7 ngày trước ngày làm.";
  if (message.includes("ADMIN_REQUIRED")) return "Chỉ admin mới có quyền duyệt lịch làm việc.";
  if (message.includes("STORE_FORBIDDEN")) return "Tài khoản chưa được phân vào cửa hàng này.";
  if (message.includes("USER_INACTIVE")) return "Tài khoản không còn hoạt động. Hãy đăng nhập lại.";
  if (message.includes("Could not find the function")) return "Cơ sở dữ liệu chưa được cập nhật chức năng đăng ký ca.";
  return message;
}

export default function StaffAttendancePage() {
  const [personalAttendances, setPersonalAttendances] = useState<PersonalAttendance[]>([]);
  const [calendarAssignments, setCalendarAssignments] = useState<CalendarAssignment[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadAttendance = useCallback(async (month: Date) => {
    setIsLoading(true);
    setLoadError(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoadError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
      setIsLoading(false);
      return;
    }

    const bounds = getMonthBounds(month);
    const today = new Date();
    const approvalEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
    const calendarEnd = isCurrentMonth && formatDateKey(approvalEnd) > bounds.end
      ? formatDateKey(approvalEnd)
      : bounds.end;
    const [personalResult, profileResult, calendarResult] = await Promise.all([
      supabase
        .from("attendance")
        .select("id, staff_id, shift_date, shift_type, check_in, check_out, hours_worked, base_pay, bonus, approved_by, approved_at")
        .eq("staff_id", user.id)
        .order("shift_date", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, role, hourly_rate")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_attendance_calendar_v2", {
        p_store_id: STORE_ID,
        p_start_date: bounds.start,
        p_end_date: calendarEnd,
      }),
    ]);

    const firstError = personalResult.error || profileResult.error || calendarResult.error;
    if (firstError) {
      setLoadError(getAttendanceError(firstError.message));
    }

    setPersonalAttendances((personalResult.data ?? []) as PersonalAttendance[]);
    setCurrentProfile((profileResult.data as Profile | null) ?? null);
    setCalendarAssignments((calendarResult.data ?? []) as CalendarAssignment[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAttendance(currentDate);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentDate, loadAttendance]);

  const colorByStaffId = useMemo(() => {
    const people = new Map<string, Pick<CalendarAssignment, "staff_id" | "full_name" | "role">>();
    calendarAssignments.forEach((assignment) => people.set(assignment.staff_id, assignment));

    const sortedPeople = Array.from(people.values()).sort((left, right) => {
      if (left.role !== right.role) return left.role === "admin" ? -1 : 1;
      return left.full_name.localeCompare(right.full_name, "vi");
    });

    const usedIndexes = new Set<number>();
    const result = new Map<string, PersonColor>();

    sortedPeople.forEach((person) => {
      const preferredIndex = person.role === "admin"
        ? 0
        : 1 + (hashString(person.staff_id) % (PERSON_COLORS.length - 1));
      let colorIndex = preferredIndex;

      for (let offset = 0; offset < PERSON_COLORS.length; offset += 1) {
        const candidate = (preferredIndex + offset) % PERSON_COLORS.length;
        if (!usedIndexes.has(candidate)) {
          colorIndex = candidate;
          break;
        }
      }

      usedIndexes.add(colorIndex);
      result.set(person.staff_id, PERSON_COLORS[colorIndex]);
    });

    return result;
  }, [calendarAssignments]);

  const calendarPeople = useMemo(() => {
    const people = new Map<string, Pick<CalendarAssignment, "staff_id" | "full_name" | "role">>();
    calendarAssignments.forEach((assignment) => people.set(assignment.staff_id, assignment));
    return Array.from(people.values()).sort((left, right) => left.full_name.localeCompare(right.full_name, "vi"));
  }, [calendarAssignments]);

  const todayKey = formatDateKey(new Date());
  const approvalWindowEnd = new Date();
  approvalWindowEnd.setDate(approvalWindowEnd.getDate() + 7);
  const approvalWindowEndKey = formatDateKey(approvalWindowEnd);
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDateAssignments = calendarAssignments.filter(
    (assignment) => assignment.shift_date === selectedDateKey,
  );
  const mySelectedDateAssignments = selectedDateAssignments.filter(
    (assignment) => assignment.staff_id === currentProfile?.id,
  );
  const isPastDate = selectedDateKey < todayKey;
  const pendingApprovals = calendarAssignments.filter(
    (assignment) => assignment.role === "staff"
      && !assignment.approved_at
      && assignment.shift_date >= todayKey
      && assignment.shift_date <= approvalWindowEndKey,
  );

  const currentMonthPersonalAttendances = personalAttendances.filter((attendance) => {
    const bounds = getMonthBounds(currentDate);
    return attendance.check_out && attendance.shift_date >= bounds.start && attendance.shift_date <= bounds.end;
  });
  const totalSalary = currentMonthPersonalAttendances.reduce(
    (sum, attendance) => sum + Number(attendance.base_pay || 0) + Number(attendance.bonus || 0),
    0,
  );
  const totalHours = currentMonthPersonalAttendances.reduce(
    (sum, attendance) => sum + Number(attendance.hours_worked || 0),
    0,
  );

  const runMutation = async (actionKey: string, mutation: () => PromiseLike<{ error: { message: string } | null }>, success: string) => {
    setPendingAction(actionKey);
    const { error } = await mutation();

    if (error) {
      toast.error(getAttendanceError(error.message));
    } else {
      toast.success(success);
      await loadAttendance(currentDate);
    }

    setPendingAction(null);
  };

  const handleShiftRegistration = async (shiftType: "morning" | "afternoon") => {
    const existing = mySelectedDateAssignments.find((assignment) => assignment.shift_type === shiftType);
    const actionKey = `registration-${selectedDateKey}-${shiftType}`;

    if (existing) {
      await runMutation(
        actionKey,
        () => supabase.rpc("unassign_shift", {
          p_store_id: STORE_ID,
          p_shift_type: shiftType,
          p_shift_date: selectedDateKey,
        }),
        "Đã hủy đăng ký ca.",
      );
      return;
    }

    await runMutation(
      actionKey,
      () => supabase.rpc("assign_shift", {
        p_store_id: STORE_ID,
        p_shift_type: shiftType,
        p_shift_date: selectedDateKey,
      }),
      "Đăng ký ca thành công.",
    );
  };

  const handleClockIn = async (shiftType: "morning" | "afternoon") => {
    await runMutation(
      `clock-in-${shiftType}`,
      () => supabase.rpc("clock_in", { p_store_id: STORE_ID, p_shift_type: shiftType }),
      "Đã bắt đầu ca làm việc.",
    );
  };

  const handleApproveShift = async (attendanceId: string) => {
    await runMutation(
      `approve-${attendanceId}`,
      () => supabase.rpc("approve_shift", { p_attendance_id: attendanceId }),
      "Đã duyệt ca làm việc.",
    );
  };

  const handleClockOut = async (attendanceId: string) => {
    await runMutation(
      `clock-out-${attendanceId}`,
      () => supabase.rpc("clock_out", { p_attendance_id: attendanceId }),
      "Đã kết thúc ca làm việc.",
    );
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const paddingCount = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-24">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="font-sans text-xl font-medium">Lịch làm việc & Chấm công</h1>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col gap-3 border border-destructive p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadAttendance(currentDate)}
            className="min-h-11 border border-ink px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Thử lại
          </button>
        </div>
      )}

      <section aria-labelledby="salary-heading" className="flex flex-col gap-4 border border-rule border-l-4 border-l-ink bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="salary-heading" className="text-lg font-medium">Dự toán lương tháng {currentDate.getMonth() + 1}</h2>
          <p className="mt-1 text-sm text-mid">Tổng thời gian đã làm: {totalHours.toFixed(2)} giờ</p>
        </div>
        <div className="font-mono text-3xl font-bold tabular-nums">{totalSalary.toLocaleString("vi-VN")} đ</div>
      </section>

      <section aria-labelledby="clock-heading">
        <h2 id="clock-heading" className="mb-4 text-xl font-medium">Chấm công hôm nay</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SHIFT_DETAILS.map((shift) => {
            const attendance = personalAttendances.find(
              (item) => item.shift_date === todayKey && item.shift_type === shift.type,
            );
            const isPending = pendingAction === `clock-in-${shift.type}` || pendingAction === `clock-out-${attendance?.id}`;
            const hasEnded = Boolean(attendance?.check_out);
            const hasStarted = Boolean(attendance?.check_in && !attendance.check_out);
            const isAwaitingApproval = Boolean(attendance && !attendance.approved_at);

            return (
              <button
                key={shift.type}
                type="button"
                disabled={!attendance || hasEnded || isPending || isAwaitingApproval}
                onClick={() => hasStarted && attendance
                  ? void handleClockOut(attendance.id)
                  : void handleClockIn(shift.type)}
                className="min-h-24 border border-rule bg-surface p-4 text-left transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-3 font-medium">
                  {shift.title}
                  {isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                </span>
                <span className="mt-1 block text-sm text-mid">{shift.time}</span>
                <span className="mt-2 block text-xs font-medium">
                  {hasEnded
                    ? "Đã kết thúc"
                    : hasStarted
                      ? "Nhấn để kết thúc ca"
                      : isAwaitingApproval
                        ? "Chờ admin duyệt"
                        : attendance
                          ? "Nhấn để bắt đầu ca"
                          : "Đăng ký ca trong lịch trước"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="calendar-heading">
        <h2 id="calendar-heading" className="mb-4 text-xl font-medium">Đăng ký lịch làm việc</h2>
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Tháng trước" className="grid h-11 w-11 place-items-center border border-transparent hover:border-rule focus-visible:outline-2 focus-visible:outline-offset-2">
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="font-medium capitalize">{currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</div>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Tháng sau" className="grid h-11 w-11 place-items-center border border-transparent hover:border-rule focus-visible:outline-2 focus-visible:outline-offset-2">
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs text-mid" aria-hidden="true">
              <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: paddingCount }, (_, index) => <div key={`padding-${index}`} />)}
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dateKey = formatDateKey(date);
                const assignments = calendarAssignments.filter((assignment) => assignment.shift_date === dateKey);
                const approvedCount = assignments.filter((assignment) => assignment.approved_at).length;
                const visibleAssignments = assignments.slice(0, 6);
                const isSelected = selectedDateKey === dateKey;
                const isToday = todayKey === dateKey;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    aria-pressed={isSelected}
                    aria-label={`${date.toLocaleDateString("vi-VN")}, ${assignments.length} ca đã đăng ký, ${approvedCount} ca đã duyệt`}
                    className={`relative flex h-[4.75rem] min-w-0 flex-col items-center border p-1 transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 ${isSelected ? "border-ink bg-surface" : "border-transparent bg-paper hover:border-rule"}`}
                  >
                    <span className={`text-sm ${isToday ? "font-bold underline underline-offset-2" : ""}`}>{day}</span>
                    <span className="mt-auto flex max-w-full flex-wrap justify-center gap-0.5" aria-hidden="true">
                      {visibleAssignments.map((assignment) => {
                        const color = colorByStaffId.get(assignment.staff_id) ?? PERSON_COLORS[2];
                        return (
                          <span
                            key={assignment.attendance_id}
                            title={`${assignment.full_name} - ${getShiftLabel(assignment.shift_type)} - ${assignment.approved_at ? "Đã duyệt" : "Chờ duyệt"}`}
                            className={`grid h-[18px] w-[18px] place-items-center text-[9px] font-bold leading-none ${assignment.shift_type === "afternoon" ? "rounded-full" : "rounded-sm"} ${color.marker} ${assignment.approved_at ? "" : "opacity-40 outline outline-1 outline-dashed outline-ink"}`}
                          >
                            {getInitials(assignment.full_name)}
                          </span>
                        );
                      })}
                      {assignments.length > visibleAssignments.length && <span className="text-[9px] font-medium">+{assignments.length - visibleAssignments.length}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {calendarPeople.length > 0 && (
              <div className="mt-4 border-t border-rule pt-4">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {calendarPeople.map((person) => {
                    const color = colorByStaffId.get(person.staff_id) ?? PERSON_COLORS[2];
                    return (
                      <div key={person.staff_id} className="flex items-center gap-2 text-sm">
                        <span className={`grid h-5 w-5 place-items-center rounded-sm text-[9px] font-bold ${color.marker}`}>{getInitials(person.full_name)}</span>
                        <span>{person.full_name}</span>
                        <span className="text-xs text-mid">{person.role === "admin" ? "Admin" : "Nhân viên"}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-mid">
                  <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-sm border border-mid" /> Ca Sáng</span>
                  <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full border border-mid" /> Ca Chiều</span>
                  <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-ink opacity-40 outline outline-1 outline-dashed outline-ink" /> Chờ duyệt</span>
                  <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-ink" /> Đã duyệt</span>
                </div>
              </div>
            )}
          </div>

          <aside className="h-fit w-full border border-rule bg-surface p-4 md:w-72" aria-label="Đăng ký ca cho ngày đã chọn">
            <div className="mb-4 font-medium capitalize">{selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</div>
            <div className="space-y-3">
              {SHIFT_DETAILS.map((shift) => {
                const existing = mySelectedDateAssignments.find((assignment) => assignment.shift_type === shift.type);
                const hasStarted = Boolean(existing?.has_checked_in);
                const isPending = pendingAction === `registration-${selectedDateKey}-${shift.type}`;
                const color = currentProfile ? colorByStaffId.get(currentProfile.id) : undefined;
                const registrationStatus = existing
                  ? existing.approved_at ? "Đã duyệt" : "Chờ admin duyệt"
                  : "Chưa đăng ký";

                return (
                  <button
                    key={shift.type}
                    type="button"
                    aria-pressed={Boolean(existing)}
                    disabled={isPastDate || hasStarted || isPending || isLoading}
                    onClick={() => void handleShiftRegistration(shift.type)}
                    className={`flex min-h-12 w-full items-center justify-between border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${existing ? `${color?.border ?? "border-ink"} bg-ink text-paper` : "border-rule bg-paper hover:border-ink"}`}
                  >
                    <span>
                      <span className="block font-medium">{shift.registrationLabel}</span>
                      <span className={`block text-xs ${existing ? "text-paper/80" : "text-mid"}`}>{shift.time} · {registrationStatus}</span>
                    </span>
                    {isPending
                      ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                      : existing && <Check aria-hidden="true" className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            {selectedDateAssignments.length > 0 && (
              <div className="mt-5 border-t border-rule pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mid">Đã đăng ký</p>
                <div className="space-y-2">
                  {selectedDateAssignments.map((assignment) => {
                    const color = colorByStaffId.get(assignment.staff_id) ?? PERSON_COLORS[2];
                    const canApprove = currentProfile?.role === "admin"
                      && assignment.role === "staff"
                      && !assignment.approved_at
                      && !assignment.has_checked_in
                      && assignment.shift_date >= todayKey
                      && assignment.shift_date <= approvalWindowEndKey;
                    const isApproving = pendingAction === `approve-${assignment.attendance_id}`;
                    return (
                      <div key={assignment.attendance_id} className="border-b border-rule pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`h-3 w-3 shrink-0 ${assignment.shift_type === "afternoon" ? "rounded-full" : "rounded-sm"} ${color.marker} ${assignment.approved_at ? "" : "opacity-40"}`} />
                          <span className="min-w-0 flex-1 truncate">{assignment.full_name}</span>
                          <span className="text-xs text-mid">{getShiftLabel(assignment.shift_type)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 pl-5 text-xs">
                          <span className={assignment.approved_at ? "text-success" : "text-mid"}>
                            {assignment.approved_at
                              ? "Đã duyệt"
                              : assignment.shift_date > approvalWindowEndKey
                                ? "Mở duyệt trước 7 ngày"
                                : "Chờ duyệt"}
                          </span>
                          {canApprove && (
                            <button
                              type="button"
                              disabled={isApproving}
                              onClick={() => void handleApproveShift(assignment.attendance_id)}
                              className="min-h-9 border border-ink bg-ink px-3 font-medium text-paper focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                            >
                              {isApproving ? "Đang duyệt..." : "Duyệt ca"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(isPastDate || mySelectedDateAssignments.some((assignment) => assignment.has_checked_in)) && (
              <p className="mt-4 text-center text-xs text-mid">
                {isPastDate ? "Không thể thay đổi lịch của ngày đã qua." : "Ca đã bắt đầu nên không thể hủy đăng ký."}
              </p>
            )}
          </aside>
        </div>
      </section>

      {currentProfile?.role === "admin" && (
        <section aria-labelledby="approval-heading" className="border border-rule bg-surface p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="approval-heading" className="text-lg font-medium">Lịch cần duyệt trong 7 ngày tới</h2>
              <p className="mt-1 text-sm text-mid">Ca của staff chỉ được check-in sau khi admin duyệt.</p>
            </div>
            <span className="font-mono text-sm tabular-nums">{pendingApprovals.length} ca</span>
          </div>

          <div className="space-y-2">
            {pendingApprovals.map((assignment) => {
              const color = colorByStaffId.get(assignment.staff_id) ?? PERSON_COLORS[2];
              const isApproving = pendingAction === `approve-${assignment.attendance_id}`;
              return (
                <div key={assignment.attendance_id} className="flex flex-col gap-3 border-t border-rule pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center text-[10px] font-bold ${color.marker}`}>
                    {getInitials(assignment.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{assignment.full_name}</div>
                    <div className="text-sm text-mid">{assignment.shift_date} · {getShiftLabel(assignment.shift_type)} · Chờ duyệt</div>
                  </div>
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={() => void handleApproveShift(assignment.attendance_id)}
                    className="min-h-11 border border-ink bg-ink px-4 text-sm font-medium text-paper focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                  >
                    {isApproving ? "Đang duyệt..." : "Duyệt ca"}
                  </button>
                </div>
              );
            })}
            {pendingApprovals.length === 0 && (
              <div className="border border-rule bg-paper p-4 text-center text-sm text-mid">Không có ca staff nào đang chờ duyệt trong 7 ngày tới.</div>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-lg font-medium">Lịch sử chấm công</h2>
        <div className="space-y-2">
          {personalAttendances.filter((attendance) => attendance.check_in).map((attendance) => (
            <div key={attendance.id} className="flex flex-col gap-3 border border-rule bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {currentProfile?.full_name && <span className="border border-rule bg-surface px-2 py-0.5 text-sm">{currentProfile.full_name}</span>}
                  <span>{attendance.shift_date} - {getShiftLabel(attendance.shift_type)}</span>
                </div>
                <div className="mt-2 text-sm text-mid">
                  Vào: {new Date(attendance.check_in!).toLocaleTimeString("vi-VN")}
                  {attendance.check_out ? ` | Ra: ${new Date(attendance.check_out).toLocaleTimeString("vi-VN")}` : ""}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                {!attendance.check_out && (
                  <button
                    type="button"
                    disabled={pendingAction === `clock-out-${attendance.id}`}
                    onClick={() => void handleClockOut(attendance.id)}
                    className="min-h-11 bg-ink px-4 text-sm text-paper focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                  >
                    Kết thúc ca
                  </button>
                )}
                {attendance.check_out && (
                  <div className="text-right">
                    <div className="font-mono font-medium tabular-nums">{attendance.hours_worked} giờ</div>
                    <div className="text-xs text-mid">+{Number(attendance.base_pay || 0).toLocaleString("vi-VN")} đ</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isLoading && personalAttendances.every((attendance) => !attendance.check_in) && (
            <div className="border border-rule bg-surface p-4 text-center text-mid">Chưa có lịch sử chấm công.</div>
          )}
        </div>
      </section>
    </div>
  );
}
