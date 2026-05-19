"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option",
  className,
  disabled
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value.toString() === value?.toString());

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-gray-400")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180 text-blue-500"
          )}
        />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 min-w-full w-max max-w-[250px] overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {options.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-gray-500 italic">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value.toString() === value?.toString();
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => {
                    onChange(option.value.toString());
                    setIsOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onChange(option.value.toString());
                      setIsOpen(false);
                    }
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-3 pr-9 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-700",
                    isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
