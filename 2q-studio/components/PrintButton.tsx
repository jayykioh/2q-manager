"use client";

import { useState } from "react";
import { Bluetooth, Printer } from "lucide-react";

type BluetoothDeviceLike = {
  name?: string;
};

type NavigatorWithBluetooth = Navigator & {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean }) => Promise<BluetoothDeviceLike>;
  };
};

export function PrintButton() {
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothConnect = async () => {
    const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;

    if (!bluetooth) {
      setBluetoothStatus("Trình duyệt này không hỗ trợ Web Bluetooth.");
      return;
    }

    try {
      setIsPairing(true);
      setBluetoothStatus(null);
      const device = await bluetooth.requestDevice({ acceptAllDevices: true });
      setBluetoothStatus(`Đã kết nối: ${device.name || "Máy in POS"}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        setBluetoothStatus("Đã hủy chọn thiết bị Bluetooth.");
      } else {
        setBluetoothStatus("Không thể kết nối Bluetooth.");
      }
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="print-hide flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85"
        >
          <Printer size={16} />
          In hóa đơn
        </button>
        <button
          type="button"
          onClick={handleBluetoothConnect}
          disabled={isPairing}
          className="inline-flex items-center gap-2 rounded-sm border border-rule bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
          title="Kết nối máy in POS qua Web Bluetooth. In trực tiếp vẫn dùng nút In hóa đơn."
        >
          <Bluetooth size={16} />
          {isPairing ? "Đang kết nối..." : "Kết nối POS"}
        </button>
      </div>
      {bluetoothStatus && (
        <p className="max-w-[260px] text-right text-xs text-mid">{bluetoothStatus}</p>
      )}
    </div>
  );
}
