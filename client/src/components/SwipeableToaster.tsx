import React, { useState, useRef, useEffect } from "react";
import toast, { useToaster, resolveValue, type Toast } from "react-hot-toast";
import { CheckCircle2, AlertCircle, Info, X, Loader2, Sparkles } from "lucide-react";

interface SwipeableToastItemProps {
  toast: Toast;
}

const SWIPE_THRESHOLD = 60; // minimum pixels to trigger swipe dismiss

const SwipeableToastItem: React.FC<SwipeableToastItemProps> = ({ toast: t }) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissDirection, setDismissDirection] = useState<"left" | "right">("right");

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalGestureRef = useRef<boolean | null>(null);

  const cleanMessage = (msg: any) => {
    if (typeof msg === "string") {
      return msg.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "").trim();
    }
    return msg;
  };

  const message = cleanMessage(resolveValue(t.message, t));

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalGestureRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null || isDismissing) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Detect gesture direction on first significant movement
    if (isHorizontalGestureRef.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalGestureRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalGestureRef.current) {
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (isDismissing) return;
    setIsDragging(false);

    if (Math.abs(dragOffset) >= SWIPE_THRESHOLD) {
      const dir = dragOffset > 0 ? "right" : "left";
      setDismissDirection(dir);
      setIsDismissing(true);
      // Wait for exit animation then dismiss
      setTimeout(() => {
        toast.dismiss(t.id);
      }, 220);
    } else {
      // Snap back smoothly
      setDragOffset(0);
    }

    startXRef.current = null;
    startYRef.current = null;
    isHorizontalGestureRef.current = null;
  };

  // Mouse drag support for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalGestureRef.current = true;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (startXRef.current === null) return;
      const diffX = e.clientX - startXRef.current;
      setDragOffset(diffX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (Math.abs(dragOffset) >= SWIPE_THRESHOLD) {
        const dir = dragOffset > 0 ? "right" : "left";
        setDismissDirection(dir);
        setIsDismissing(true);
        setTimeout(() => {
          toast.dismiss(t.id);
        }, 220);
      } else {
        setDragOffset(0);
      }
      startXRef.current = null;
      startYRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, t.id]);

  // Compute icon and accents based on toast type
  let icon = <Sparkles className="h-4 w-4 text-white" />;
  let accentBorder = "border-white/10";
  let iconBg = "bg-white/10 text-white";

  if (t.type === "success") {
    icon = <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[2.5]" />;
    accentBorder = "border-emerald-500/30";
    iconBg = "bg-emerald-500/15 text-emerald-400";
  } else if (t.type === "error") {
    icon = <AlertCircle className="h-4 w-4 text-[#FF4D4D] stroke-[2.5]" />;
    accentBorder = "border-[#FF0000]/30";
    iconBg = "bg-[#FF0000]/15 text-[#FF4D4D]";
  } else if (t.type === "loading") {
    icon = <Loader2 className="h-4 w-4 text-[#FF4D4D] animate-spin stroke-[2.5]" />;
    accentBorder = "border-[#FF0000]/30";
    iconBg = "bg-[#FF0000]/15 text-[#FF4D4D]";
  } else {
    icon = <Info className="h-4 w-4 text-white/90 stroke-[2.5]" />;
    accentBorder = "border-white/15";
    iconBg = "bg-white/10 text-white";
  }

  // Animation styles
  let transform = `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`;
  let opacity = Math.max(0.1, 1 - Math.abs(dragOffset) / 220);
  let transition = isDragging ? "none" : "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)";

  if (isDismissing) {
    transform = `translateX(${dismissDirection === "right" ? "120%" : "-120%"}) rotate(${
      dismissDirection === "right" ? "12deg" : "-12deg"
    })`;
    opacity = 0;
    transition = "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)";
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        transform,
        opacity,
        transition,
      }}
      className={`group relative pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#121212]/95 backdrop-blur-xl border ${accentBorder} shadow-2xl shadow-black/80 select-none cursor-grab active:cursor-grabbing w-full max-w-md transition-shadow hover:shadow-white/5 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      {/* Type Icon */}
      <div
        className={`h-8 w-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm`}
      >
        {icon}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="font-['Outfit'] text-[13.5px] font-bold text-white tracking-tight leading-snug line-clamp-2">
          {message}
        </p>
        <span className="text-[10.5px] text-[#717171] font-medium tracking-wide flex items-center gap-1 mt-0.5">
          <span>Swipe left or right to dismiss</span>
        </span>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissing(true);
          setTimeout(() => {
            toast.dismiss(t.id);
          }, 200);
        }}
        className="h-6 w-6 rounded-lg bg-white/5 hover:bg-white/15 text-[#AAAAAA] hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Subtle indicator pills showing drag swipe direction */}
      {Math.abs(dragOffset) > 15 && (
        <div
          className={`absolute inset-y-0 ${
            dragOffset > 0 ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
          } from-white/10 to-transparent w-8 rounded-2xl pointer-events-none`}
        />
      )}
    </div>
  );
};

export const SwipeableToaster: React.FC = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  return (
    <div
      onMouseEnter={startPause}
      onMouseLeave={endPause}
      className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2.5 pointer-events-none px-4"
    >
      {toasts
        .filter((t) => t.visible)
        .map((t) => (
          <SwipeableToastItem key={t.id} toast={t} />
        ))}
    </div>
  );
};

export default SwipeableToaster;
