"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { bsToAd, cn, formatBsMonthYear, formatDate, getBsDateParts, getBsMonthDays, getBsMonthStartWeekday, toNepaliDigits } from "@/lib/utils";

interface NepaliDateInputProps {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  className?: string;
}

const weekLabels = ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function NepaliDateInput({ value, onChange, min, placeholder = "Select date", className }: NepaliDateInputProps) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const selectedBs = React.useMemo(() => {
    if (!value) return null;
    return getBsDateParts(value);
  }, [value]);

  const todayBs = React.useMemo(() => getBsDateParts(new Date()), []);
  const [visibleMonth, setVisibleMonth] = React.useState(() => selectedBs || todayBs || { year: 2083, month: 1, day: 1 });

  React.useEffect(() => {
    if (selectedBs) {
      setVisibleMonth({ year: selectedBs.year, month: selectedBs.month, day: selectedBs.day });
    }
  }, [selectedBs]);

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const minDate = React.useMemo(() => {
    if (min) {
      const parsed = new Date(min);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, [min]);

  const daysInMonth = React.useMemo(
    () => getBsMonthDays(visibleMonth.year, visibleMonth.month),
    [visibleMonth.year, visibleMonth.month]
  );

  const monthStartWeekday = React.useMemo(
    () => getBsMonthStartWeekday(visibleMonth.year, visibleMonth.month),
    [visibleMonth.year, visibleMonth.month]
  );

  const monthDays = React.useMemo(() => {
    const blanks = Array.from({ length: monthStartWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    return [...blanks, ...days];
  }, [daysInMonth, monthStartWeekday]);

  const selectedDay = selectedBs?.day;

  const handleMonthChange = (offset: number) => {
    let nextYear = visibleMonth.year;
    let nextMonth = visibleMonth.month + offset;
    if (nextMonth < 1) {
      nextYear -= 1;
      nextMonth = 12;
    } else if (nextMonth > 12) {
      nextYear += 1;
      nextMonth = 1;
    }
    setVisibleMonth({ year: nextYear, month: nextMonth, day: 1 });
  };

  const isDayDisabled = (day: number) => {
    try {
      const ad = bsToAd(`${visibleMonth.year}-${pad(visibleMonth.month)}-${pad(day)}`);
      if (!ad) return true;
      return new Date(ad) < minDate;
    } catch {
      return true;
    }
  };

  const isPrevMonthDisabled = React.useMemo(() => {
    const prevYear = visibleMonth.month === 1 ? visibleMonth.year - 1 : visibleMonth.year;
    const prevMonth = visibleMonth.month === 1 ? 12 : visibleMonth.month - 1;
    const days = getBsMonthDays(prevYear, prevMonth);
    try {
      const lastAd = bsToAd(`${prevYear}-${pad(prevMonth)}-${pad(days)}`);
      return new Date(lastAd) < minDate;
    } catch {
      return true;
    }
  }, [visibleMonth, minDate]);

  const setSelectedDate = (day: number) => {
    const ad = bsToAd(`${visibleMonth.year}-${pad(visibleMonth.month)}-${pad(day)}`);
    if (!ad) return;
    onChange(ad);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn(className || "relative w-full", open && "z-50")}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full text-left h-11 px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between gap-3 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? formatDate(value) : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div
          className="absolute z-[100] mt-2 w-[320px] rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ fontFamily: "var(--font-devanagari), 'Noto Sans Devanagari', 'Mangal', sans-serif" }}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              type="button"
              disabled={isPrevMonthDisabled}
              onClick={() => handleMonthChange(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-base font-bold text-gray-900 tracking-tight">
              {formatBsMonthYear(visibleMonth.year, visibleMonth.month)}
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors border border-transparent hover:border-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekLabels.map((label) => (
              <span key={label} className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-wider py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} className="h-10" />;

              const isSelected = selectedDay === day && selectedBs?.year === visibleMonth.year && selectedBs?.month === visibleMonth.month;
              const isToday = todayBs && todayBs.day === day && todayBs.year === visibleMonth.year && todayBs.month === visibleMonth.month;
              const disabled = isDayDisabled(day);

              return (
                <button
                  type="button"
                  key={`day-${visibleMonth.year}-${visibleMonth.month}-${day}`}
                  disabled={disabled}
                  onClick={() => setSelectedDate(day)}
                  style={{ fontFamily: "var(--font-devanagari), 'Noto Sans Devanagari', 'Mangal', sans-serif" }}
                  className={`
                    h-10 rounded-xl text-sm font-medium transition-all relative group
                    ${isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200 z-10 scale-105"
                      : isToday
                        ? "text-blue-600 bg-blue-50 font-bold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    }
                    ${disabled ? "cursor-not-allowed text-gray-200 hover:bg-transparent hover:text-gray-200" : ""}
                  `}
                >
                  {toNepaliDigits(day)}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (todayBs) {
                  const ad = bsToAd(`${todayBs.year}-${pad(todayBs.month)}-${pad(todayBs.day)}`);
                  if (ad) onChange(ad);
                }
                setOpen(false);
              }}
              className="text-[11px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
            >
              आज (Today)
            </button>
            <div className="text-[10px] text-gray-400 font-medium">
              B.S. Calendar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
