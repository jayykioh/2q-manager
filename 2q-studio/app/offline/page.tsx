"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

const OFF_QUOTES = [
  "Mất mạng rồi! Nhưng bình tĩnh, chỉ là mất kết nối thôi, mạng của bạn vẫn còn nguyên nhé! 😉",
  "Cá mập lại ngứa răng cắn cáp quang rồi, hay là hàng xóm vừa đổi mật khẩu Wifi? 🦈",
  "Mạng chập chờn như thời tiết vậy, lúc có lúc không, lúc vui lúc buồn. ⛅",
  "Có thờ có thiêng, có kiên trì nhấn 'Tải lại' mới mong có Wifi. 🕯️",
  "Internet đã đi du lịch không hẹn ngày về. Đi làm cốc cà phê sữa đá rồi quay lại xem sao nha! ☕",
  "Đang yên đang lành tự dưng... mạng quay đều, quay đều, quay đều... 🚲",
  "Hình như ai đó vừa đá phải dây nguồn router rồi, kiểm tra xem nào! 🔌",
  "Không có mạng thì làm sao làm việc? Thôi thì tự thưởng cho mình vài phút giải lao vậy! 🎮"
];

export default function OfflinePage() {
  const [quote, setQuote] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Select a random quote on client mount to avoid hydration mismatch
    const randomIndex = Math.floor(Math.random() * OFF_QUOTES.length);
    setQuote(OFF_QUOTES[randomIndex]);

    // Automatically redirect when connection is restored
    const handleOnline = () => {
      window.location.href = "/";
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleRetry = () => {
    setIsChecking(true);
    
    // Check connection
    if (navigator.onLine) {
      window.location.href = "/";
    } else {
      setTimeout(() => {
        setIsChecking(false);
        // Change to another funny quote on retry failure
        const currentQuoteIndex = OFF_QUOTES.indexOf(quote);
        let nextIndex = Math.floor(Math.random() * OFF_QUOTES.length);
        if (nextIndex === currentQuoteIndex && OFF_QUOTES.length > 1) {
          nextIndex = (nextIndex + 1) % OFF_QUOTES.length;
        }
        setQuote(OFF_QUOTES[nextIndex]);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4 text-ink transition-colors duration-200">
      <div className="w-full max-w-md p-8 bg-paper border border-rule relative overflow-hidden shadow-sm flex flex-col items-center">
        {/* Receipt aesthetic decorative header line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-ink opacity-10" />
        
        {/* Connection status badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-rule text-xs font-mono mb-8 uppercase tracking-wider text-mid">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Offline Mode
        </div>

        {/* Big icon */}
        <div className="w-20 h-20 rounded-full bg-surface border border-rule flex items-center justify-center mb-6 text-mid">
          <WifiOff size={36} />
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl tracking-widest mb-4 text-center uppercase">
          Mất kết nối
        </h1>

        {/* Divider */}
        <div className="w-full border-t border-dashed border-rule my-4" />

        {/* Funny quote card */}
        <div className="bg-surface border border-rule p-4 my-2 text-center rounded-sm min-h-[80px] flex items-center justify-center">
          <p className="text-sm font-sans italic text-mid leading-relaxed">
            &ldquo;{quote || "Đang tải câu nói vui..."}&rdquo;
          </p>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-dashed border-rule my-4 mb-6" />

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full bg-ink text-paper py-3 font-medium uppercase tracking-wider disabled:opacity-50 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
          {isChecking ? "Đang thử lại..." : "Thử kết nối lại"}
        </button>

        {/* Auto detection tip */}
        <p className="text-[11px] text-mid font-mono mt-4 text-center uppercase tracking-tight">
          Hệ thống sẽ tự động tải lại khi phát hiện có mạng
        </p>
      </div>
    </div>
  );
}
