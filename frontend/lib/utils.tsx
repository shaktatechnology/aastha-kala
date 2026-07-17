import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ADToBS, BSToAD } from "bikram-sambat-js";

export const nepaliMonthNames = [
  "बैशाख",
  "जेठ",
  "आषाढ",
  "श्रावण",
  "भाद्र",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुण",
  "चैत्र",
];

const nepaliDigits: Record<string, string> = {
  0: "०",
  1: "१",
  2: "२",
  3: "३",
  4: "४",
  5: "५",
  6: "६",
  7: "७",
  8: "८",
  9: "९",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseDate(date: string | number | Date) {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === "number") {
    return new Date(date);
  }
  return new Date(date);
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function toNepaliDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => nepaliDigits[digit] ?? digit);
}

function getBsParts(date: string | number | Date) {
  const parsed = parseDate(date);
  if (!isValidDate(parsed)) {
    return null;
  }

  try {
    const bsDate = ADToBS(parsed);
    const [year, month, day] = bsDate.split("-");
    const monthName = nepaliMonthNames[Number(month) - 1] ?? "";
    return {
      year,
      month,
      day,
      monthName,
    };
  } catch {
    return null;
  }
}

export function getBsDateParts(date: string | number | Date) {
  const parsed = parseDate(date);
  if (!isValidDate(parsed)) {
    return null;
  }

  try {
    const bsDate = ADToBS(parsed);
    const [year, month, day] = bsDate.split("-");
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day),
    };
  } catch {
    return null;
  }
}

export function bsToAd(bsDate: string) {
  try {
    return BSToAD(bsDate);
  } catch {
    return "";
  }
}

export function formatBsMonthYear(year: number, month: number) {
  return `${nepaliMonthNames[month - 1] ?? ""} ${toNepaliDigits(year)}`;
}

export function getBsMonthDays(year: number, month: number) {
  for (let day = 1; day <= 33; day += 1) {
    try {
      BSToAD(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
    } catch {
      return day - 1;
    }
  }
  return 32;
}

export function getBsMonthStartWeekday(year: number, month: number) {
  const adDate = bsToAd(`${year}-${String(month).padStart(2, "0")}-01`);
  if (!adDate) {
    return 0;
  }
  return new Date(adDate).getDay();
}

export function formatDate(date: string | number | Date) {
  const bs = getBsParts(date);
  if (!bs) {
    return "";
  }

  return `${toNepaliDigits(bs.day)} ${bs.monthName} ${toNepaliDigits(bs.year)}`;
}

export function formatDateShort(date: string | number | Date) {
  const bs = getBsParts(date);
  if (!bs) {
    return "";
  }

  return `${toNepaliDigits(bs.day)} ${bs.monthName}`;
}

export function formatDateTime(date: string | number | Date) {
  const bs = formatDate(date);
  if (!bs) {
    return "";
  }

  const parsed = parseDate(date);
  if (!isValidDate(parsed)) {
    return bs;
  }

  const timeString = parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${bs} ${toNepaliDigits(timeString)}`;
}

export function formatMonthYear(date: string | number | Date) {
  const bs = getBsParts(date);
  if (!bs) {
    return "";
  }

  return `${bs.monthName} ${toNepaliDigits(bs.year)}`;
}

export function bsMonthYearToAdMonthYear(year: number, month: number) {
  try {
    // Get AD date for the middle of the BS month to determine the primary AD month it falls into
    const adDate = bsToAd(`${year}-${String(month).padStart(2, "0")}-15`);
    if (!adDate) return "";
    const date = new Date(adDate);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export function formatLargeNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
