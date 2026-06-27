"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StaffAttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const supabase = createClient();

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
      p_store_id: "11111111-1111-1111-1111-111111111111", // default store
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

  return (
    <div className="p-4">
      <h2 className="font-sans text-xl font-medium mb-4">Chấm công hôm nay</h2>
      
      <div className="flex gap-4 mb-8">
        <button onClick={() => handleClockIn("morning")} className="flex-1 bg-surface border border-rule p-4 text-center hover:border-ink">
          <div className="font-medium">Ca Sáng</div>
          <div className="text-mid text-sm">09:00 - 15:00</div>
        </button>
        <button onClick={() => handleClockIn("afternoon")} className="flex-1 bg-surface border border-rule p-4 text-center hover:border-ink">
          <div className="font-medium">Ca Chiều</div>
          <div className="text-mid text-sm">15:00 - 21:00</div>
        </button>
      </div>

      <h3 className="font-medium text-lg mb-2">Lịch sử chấm công</h3>
      <div className="space-y-2">
        {attendances.map((a) => (
          <div key={a.id} className="bg-paper border border-rule p-3 flex justify-between items-center">
            <div>
              <div className="font-medium">{a.shift_date} - {a.shift_type}</div>
              <div className="text-sm text-mid">
                In: {new Date(a.check_in).toLocaleTimeString()}
                {a.check_out ? ` | Out: ${new Date(a.check_out).toLocaleTimeString()}` : ""}
              </div>
            </div>
            {!a.check_out && (
              <button onClick={() => handleClockOut(a.id)} className="bg-ink text-paper px-4 py-2 text-sm ">
                Clock Out
              </button>
            )}
            {a.check_out && (
              <div className="font-mono text-sm">{a.hours_worked} hrs</div>
            )}
          </div>
        ))}
        {attendances.length === 0 && <div className="text-mid">Chưa có lịch sử.</div>}
      </div>
    </div>
  );
}
