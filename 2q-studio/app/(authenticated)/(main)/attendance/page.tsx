"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export default function StaffAttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const supabase = createClient();
  const storeId = "11111111-1111-1111-1111-111111111111"; // default store

  const fetchAttendance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("staff_id", user.id)
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
    // Note: adjust for local timezone to ensure YYYY-MM-DD matches local day
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
  const padding = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i); // Assuming Monday start

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Get assignments for a specific date
  const getAssignmentsForDate = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; 
    const localDate = new Date(date.getTime() - tzOffset);
    const dateStr = localDate.toISOString().split('T')[0];
    return attendances.filter(a => a.shift_date === dateStr);
  };

  const selectedDateAssignments = getAssignmentsForDate(selectedDate);
  const isAssigned = (type: string) => selectedDateAssignments.some(a => a.shift_type === type);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8 pb-20">
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
                const hasClockedIn = assignments.some(a => a.check_in != null);
                return (
                  <button 
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 border relative h-12 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-ink bg-surface' : 'border-transparent hover:border-rule bg-paper'
                    } ${hasClockedIn ? 'opacity-50' : ''}`}
                  >
                    <span className={date.toDateString() === new Date().toDateString() ? 'font-bold text-ink underline' : ''}>{day}</span>
                    {assignments.length > 0 && (
                      <div className="absolute bottom-1 flex gap-1">
                        {assignments.some(a => a.shift_type === 'morning') && <div className="w-1.5 h-1.5 rounded-full bg-ink" />}
                        {assignments.some(a => a.shift_type === 'afternoon') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="w-full md:w-64 bg-surface border border-rule p-4 rounded-sm">
            <div className="font-medium mb-4 capitalize">{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</div>
            <div className="space-y-3">
              <button 
                onClick={() => isAssigned('morning') ? handleUnassignShift('morning', selectedDate) : handleAssignShift('morning', selectedDate)}
                className={`w-full flex items-center justify-between p-3 border transition-colors ${isAssigned('morning') ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink bg-paper'}`}
              >
                <span>Ca Sáng</span>
                {isAssigned('morning') && <Check className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => isAssigned('afternoon') ? handleUnassignShift('afternoon', selectedDate) : handleAssignShift('afternoon', selectedDate)}
                className={`w-full flex items-center justify-between p-3 border transition-colors ${isAssigned('afternoon') ? 'border-blue-500 bg-blue-500 text-white' : 'border-rule hover:border-blue-500 bg-paper'}`}
              >
                <span>Ca Chiều</span>
                {isAssigned('afternoon') && <Check className="w-4 h-4" />}
              </button>
            </div>
            {selectedDateAssignments.some(a => a.check_in != null) && (
              <div className="mt-4 text-xs text-mid text-center">
                Đã có dữ liệu chấm công cho ngày này, không thể thay đổi ca.
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
                <div className="font-medium">{a.shift_date} - {a.shift_type === 'morning' ? 'Ca Sáng' : 'Ca Chiều'}</div>
                <div className="text-sm text-mid mt-1">
                  In: {new Date(a.check_in).toLocaleTimeString()}
                  {a.check_out ? ` | Out: ${new Date(a.check_out).toLocaleTimeString()}` : ""}
                </div>
              </div>
              {!a.check_out && (
                <button onClick={() => handleClockOut(a.id)} className="bg-ink text-paper px-4 py-2 text-sm rounded-sm">
                  Clock Out
                </button>
              )}
              {a.check_out && (
                <div className="font-mono text-sm">{a.hours_worked} hrs</div>
              )}
            </div>
          ))}
          {attendances.filter(a => a.check_in != null).length === 0 && <div className="text-mid p-4 bg-surface border border-rule text-center">Chưa có lịch sử chấm công.</div>}
        </div>
      </div>
    </div>
  );
}
