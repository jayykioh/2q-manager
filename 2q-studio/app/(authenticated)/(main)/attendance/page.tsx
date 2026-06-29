"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const STAFF_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-violet-500",
];

function getStaffColor(profile: any) {
  if (!profile) return { bg: "bg-gray-500", text: "text-white" };
  if (profile.role === "admin") return { bg: "bg-blue-500", text: "text-white" };
  
  // Hash the ID to pick a consistent color
  let hash = 0;
  const str = profile.id || "";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % STAFF_COLORS.length;
  return { bg: STAFF_COLORS[index], text: "text-white" };
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StaffAttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const supabase = createClient();
  const storeId = "11111111-1111-1111-1111-111111111111"; // default store

  const fetchAttendance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const { data } = await supabase
      .from("attendance")
      .select("*, profiles(id, full_name, role, hourly_rate)")
      .order("shift_date", { ascending: false });
    
    setAttendances(data || []);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleClockIn = async (shiftType: string) => {
    const { error } = await supabase.rpc("clock_in", {
      p_store_id: storeId,
      p_shift_type: shiftType
    });
    if (error) alert("Clock In Error: " + error.message);
    else fetchAttendance();
  };

  const handleClockOut = async (attendanceId: string) => {
    const { error } = await supabase.rpc("clock_out", { p_attendance_id: attendanceId });
    if (error) alert("Clock Out Error: " + error.message);
    else fetchAttendance();
  };

  const handleAssignShift = async (shiftType: string, date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; 
    const localDate = new Date(date.getTime() - tzOffset);
    const dateStr = localDate.toISOString().split('T')[0];
    
    const { error } = await supabase.rpc("assign_shift", {
      p_store_id: storeId,
      p_shift_type: shiftType,
      p_shift_date: dateStr
    });
    if (error) alert("Assign Error: " + error.message);
    else fetchAttendance();
  };

  const handleUnassignShift = async (shiftType: string, date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; 
    const localDate = new Date(date.getTime() - tzOffset);
    const dateStr = localDate.toISOString().split('T')[0];

    const { error } = await supabase.rpc("unassign_shift", {
      p_store_id: storeId,
      p_shift_type: shiftType,
      p_shift_date: dateStr
    });
    if (error) alert("Unassign Error: " + error.message);
    else fetchAttendance();
  };

  // Calendar logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getAssignmentsForDate = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; 
    const localDate = new Date(date.getTime() - tzOffset);
    const dateStr = localDate.toISOString().split('T')[0];
    return attendances.filter(a => a.shift_date === dateStr);
  };

  const selectedDateAssignments = getAssignmentsForDate(selectedDate);
  const mySelectedDateAssignments = selectedDateAssignments.filter(a => a.staff_id === currentUser?.id);
  const isAssigned = (type: string) => mySelectedDateAssignments.some(a => a.shift_type === type);

  // Salary Calculation
  const currentMonthMyAttendances = attendances.filter(a => {
    if (a.staff_id !== currentUser?.id) return false;
    if (!a.check_out) return false;
    const date = new Date(a.shift_date);
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  });

  const totalSalary = currentMonthMyAttendances.reduce((sum, a) => sum + (Number(a.base_pay) || 0) + (Number(a.bonus) || 0), 0);
  const totalHours = currentMonthMyAttendances.reduce((sum, a) => sum + (Number(a.hours_worked) || 0), 0);

  // Unique staff involved in the current month for Legend
  const currentMonthAttendancesAll = attendances.filter(a => {
    const date = new Date(a.shift_date);
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  });
  const uniqueStaffMap = new Map();
  currentMonthAttendancesAll.forEach(a => {
    if (a.profiles) uniqueStaffMap.set(a.staff_id, a.profiles);
  });
  const uniqueStaff = Array.from(uniqueStaffMap.values());

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Salary Box Section */}
      <div className="bg-surface border border-rule p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-l-ink">
        <div>
          <h3 className="font-medium text-lg">Dự toán lương tháng {currentDate.getMonth() + 1}</h3>
          <div className="text-sm text-mid mt-1">Tổng thời gian đã làm: {totalHours.toFixed(2)} giờ</div>
        </div>
        <div className="text-3xl font-mono font-bold text-ink">
          {totalSalary.toLocaleString()} đ
        </div>
      </div>

      {/* Today's Clock In Section */}
      <div>
        <h2 className="font-sans text-xl font-medium mb-4">Chấm công hôm nay</h2>
        <div className="flex gap-4">
          <button onClick={() => handleClockIn("morning")} className="flex-1 bg-surface border border-rule p-4 text-center hover:border-ink transition-colors">
            <div className="font-medium">Ca Sáng</div>
            <div className="text-mid text-sm">09:00 - 15:00</div>
          </button>
          <button onClick={() => handleClockIn("afternoon")} className="flex-1 bg-surface border border-rule p-4 text-center hover:border-ink transition-colors">
            <div className="font-medium">Ca Chiều</div>
            <div className="text-mid text-sm">15:00 - 21:00</div>
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      <div>
        <h2 className="font-sans text-xl font-medium mb-4">Đăng ký lịch làm việc</h2>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-surface rounded-full"><ChevronLeft className="w-5 h-5" /></button>
              <div className="font-medium capitalize">
                {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-surface rounded-full"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2 text-mid">
              <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {padding.map((_, i) => <div key={`pad-${i}`} className="p-2" />)}
              {days.map(day => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const assignments = getAssignmentsForDate(date);
                const myAssignments = assignments.filter(a => a.staff_id === currentUser?.id);
                const hasClockedIn = myAssignments.some(a => a.check_in != null);
                
                const morningAssignments = assignments.filter(a => a.shift_type === 'morning');
                const afternoonAssignments = assignments.filter(a => a.shift_type === 'afternoon');

                return (
                  <button 
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`p-1 border relative h-16 flex flex-col items-center transition-colors ${
                      isSelected ? 'border-ink bg-surface' : 'border-transparent hover:border-rule bg-paper'
                    } ${hasClockedIn ? 'opacity-60' : ''}`}
                  >
                    <span className={`text-sm ${date.toDateString() === new Date().toDateString() ? 'font-bold text-ink underline' : ''}`}>{day}</span>
                    
                    <div className="w-full mt-auto space-y-0.5">
                      {morningAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {morningAssignments.map(a => {
                            const color = getStaffColor(a.profiles);
                            return (
                              <div key={a.id} title={`${a.profiles?.full_name} (Ca Sáng)`} className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-medium ${color.bg} ${color.text}`}>
                                {getInitials(a.profiles?.full_name)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {afternoonAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {afternoonAssignments.map(a => {
                            const color = getStaffColor(a.profiles);
                            return (
                              <div key={a.id} title={`${a.profiles?.full_name} (Ca Chiều)`} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-medium ${color.bg} ${color.text}`}>
                                {getInitials(a.profiles?.full_name)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            {uniqueStaff.length > 0 && (
              <div className="mt-4 pt-4 border-t border-rule flex flex-wrap gap-3">
                {uniqueStaff.map(profile => {
                  const color = getStaffColor(profile);
                  return (
                    <div key={profile.id} className="flex items-center gap-2 text-sm text-mid">
                      <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-medium ${color.bg} ${color.text}`}>
                        {getInitials(profile.full_name)}
                      </div>
                      <span>{profile.full_name}</span>
                    </div>
                  );
                })}
                <div className="w-full text-xs text-mid mt-2 flex gap-4">
                  <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 border border-mid rounded-sm" /> Ca Sáng</div>
                  <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 border border-mid rounded-full" /> Ca Chiều</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-64 bg-surface border border-rule p-4 rounded-sm h-fit">
            <div className="font-medium mb-4 capitalize">{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</div>
            <div className="space-y-3">
              <button 
                onClick={() => isAssigned('morning') ? handleUnassignShift('morning', selectedDate) : handleAssignShift('morning', selectedDate)}
                className={`w-full flex items-center justify-between p-3 border transition-colors ${isAssigned('morning') ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink bg-paper'}`}
              >
                <span>Đăng ký Sáng</span>
                {isAssigned('morning') && <Check className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => isAssigned('afternoon') ? handleUnassignShift('afternoon', selectedDate) : handleAssignShift('afternoon', selectedDate)}
                className={`w-full flex items-center justify-between p-3 border transition-colors ${isAssigned('afternoon') ? 'border-blue-500 bg-blue-500 text-white' : 'border-rule hover:border-blue-500 bg-paper'}`}
              >
                <span>Đăng ký Chiều</span>
                {isAssigned('afternoon') && <Check className="w-4 h-4" />}
              </button>
            </div>
            {mySelectedDateAssignments.some(a => a.check_in != null) && (
              <div className="mt-4 text-xs text-mid text-center">
                Bạn đã có dữ liệu chấm công cho ngày này, không thể thay đổi ca.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      <div>
        <h3 className="font-medium text-lg mb-4">Lịch sử chấm công</h3>
        <div className="space-y-2">
          {attendances.filter(a => a.check_in != null).map((a) => (
            <div key={a.id} className="bg-paper border border-rule p-4 flex justify-between items-center rounded-sm">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {a.profiles?.full_name && (
                    <span className="text-sm px-2 py-0.5 rounded-full bg-surface border border-rule">
                      {a.profiles.full_name}
                    </span>
                  )}
                  {a.shift_date} - {a.shift_type === 'morning' ? 'Ca Sáng' : 'Ca Chiều'}
                </div>
                <div className="text-sm text-mid mt-2">
                  In: {new Date(a.check_in).toLocaleTimeString()}
                  {a.check_out ? ` | Out: ${new Date(a.check_out).toLocaleTimeString()}` : ""}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {!a.check_out && a.staff_id === currentUser?.id && (
                  <button onClick={() => handleClockOut(a.id)} className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
                    Clock Out
                  </button>
                )}
                {a.check_out && (
                  <div className="text-right">
                    <div className="font-mono font-medium">{a.hours_worked} giờ</div>
                    {a.staff_id === currentUser?.id && (
                       <div className="text-xs text-mid">+{Number(a.base_pay || 0).toLocaleString()}đ</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {attendances.filter(a => a.check_in != null).length === 0 && <div className="text-mid p-4 bg-surface border border-rule text-center">Chưa có lịch sử chấm công.</div>}
        </div>
      </div>
    </div>
  );
}
