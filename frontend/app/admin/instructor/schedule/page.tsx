"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Calendar, 
  Search, 
  Users, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  UserCheck,
  Activity
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { toast, Toaster } from "sonner";
import { Pagination } from "@/components/global/Pagination";
import { to12h } from "@/lib/timeFormat";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";


/** Convert "HH:MM" or "HH:MM:SS" → integer minutes since midnight */
const toMins = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.substring(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Convert integer minutes → "HH:MM" */
const fromMins = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Subtract a booked interval [bStart, bEnd] from a list of free [segStart, segEnd] pairs.
 */
const subtractInterval = (segments: [number, number][], bStart: number, bEnd: number): [number, number][] => {
  const result: [number, number][] = [];
  for (const [segStart, segEnd] of segments) {
    if (bEnd <= segStart || bStart >= segEnd) {
      result.push([segStart, segEnd]); // no overlap
      continue;
    }
    if (segStart < bStart) result.push([segStart, bStart]); // left slice
    if (bEnd < segEnd)     result.push([bEnd, segEnd]);     // right slice
  }
  return result;
};

/**
 * Compute remaining free segments.
 */
const computeFreeSegments = (
  availabilities: { start_time: string; end_time: string }[],
  classes: { start_time: string; end_time: string }[]
): { start: string; end: string }[] => {
  const booked: [number, number][] = classes
    .map((c) => [toMins(c.start_time), toMins(c.end_time)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const freeSegments: { start: string; end: string }[] = [];

  for (const avail of availabilities) {
    const availStart = toMins(avail.start_time);
    const availEnd   = toMins(avail.end_time);
    let segments: [number, number][] = [[availStart, availEnd]];

    for (const [bs, be] of booked) {
      segments = subtractInterval(segments, bs, be);
      if (segments.length === 0) break;
    }

    for (const [segStart, segEnd] of segments) {
      if (segEnd - segStart >= 5) { // ignore slivers < 5 min
        freeSegments.push({ start: fromMins(segStart), end: fromMins(segEnd) });
      }
    }
  }

  return freeSegments;
};

const InstructorSchedulePage = () => {
  const router = useRouter();
  const [instructorsSchedules, setInstructorsSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedInstructor, setExpandedInstructor] = useState<number | null>(null);

  // Local filter buffers
  const [searchInput, setSearchInput] = useState("");

  const handleApplyFilters = () => {
    setSearchTerm(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyFilters();
  };

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const fetchSchedules = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/instructors-schedules?page=${page}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to fetch schedules");

      const list = result.data?.data || result.data || [];
      if (list.length === 0 && page > 1) {
        fetchSchedules(page - 1);
        return;
      }

      setInstructorsSchedules(list);

      if (result.data?.last_page) {
        setPagination({
          currentPage: result.data.current_page,
          totalPages: result.data.last_page,
          totalItems: result.data.total,
          itemsPerPage: result.data.per_page,
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const filteredSchedules = instructorsSchedules.filter((item: any) =>
    item.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.classes.some((c: any) =>
      c.program_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.parent_program_title && c.parent_program_title.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const isOngoing = (startTime: string, endTime: string) => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = toMins(startTime);
    const endMins = toMins(endTime);
    return currentMins >= startMins && currentMins <= endMins;
  };

  if (loading && instructorsSchedules.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-text-muted text-xs font-bold uppercase tracking-wider">Loading schedules...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header Section */}
      <header className="flex flex-col lg:flex-row justify-between items-center p-6 bg-surface border border-border rounded-xl gap-6 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
        
        <div className="relative z-10 flex flex-col items-center lg:items-start w-full lg:w-auto">
          <h1 className="text-xl lg:text-2xl font-black text-text-primary tracking-tight">
            Instructor Schedules
          </h1>
          
          <div className="flex bg-background border border-border p-1 rounded-lg mt-3 w-fit shadow-sm">
            <button 
              onClick={() => router.push("/admin/instructor")}
              className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all text-text-muted hover:text-text-secondary"
            >
              Instructor List
            </button>
            <button 
              onClick={() => router.push("/admin/instructor/schedule")}
              className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all bg-surface text-primary shadow-sm"
            >
              Schedules
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Filters Section */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 group/search">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by instructor or program..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-background border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-text-primary placeholder:text-text-muted shadow-sm"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2.5 text-[9px] font-black uppercase tracking-widest bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                Apply
              </button>

              {(searchInput !== "" || searchTerm !== "") && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest border border-border text-text-secondary rounded-xl hover:bg-surface-hover transition-all cursor-pointer whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-text-muted font-black uppercase tracking-wider">Total Instructors</p>
          </div>
          <p className="text-2xl font-black text-text-primary mt-3">{pagination.totalItems}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Activity className="w-4 h-4 text-success" />
            </div>
            <p className="text-xs text-text-muted font-black uppercase tracking-wider">Active Classes Today</p>
          </div>
          <p className="text-2xl font-black text-success mt-3">
            {instructorsSchedules.reduce((acc, item) => acc + item.classes.length, 0)}
          </p>
        </div>
      </div>


        {/* Instructors Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[80px] font-semibold text-gray-700">SN</TableHead>
                  <TableHead className="font-semibold text-gray-700">Instructor</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">Assigned Classes</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No schedules found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchedules.map((item, index) => {
                    const sn = (pagination.currentPage - 1) * pagination.itemsPerPage + index + 1;
                    const isExpanded = expandedInstructor === item.instructor.id;

                    return (
                      <React.Fragment key={item.instructor.id}>
                        <TableRow className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-primary/5' : ''}`}>
                          <TableCell className="font-medium">{sn}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {item.instructor.image ? (
                                  <img
                                    src={item.instructor.image}
                                    alt={item.instructor.name}
                                    className="w-10 h-10 rounded-lg object-cover"
                                    onError={(e: any) => {
                                      e.target.src = `https://ui-avatars.com/api/?name=${item.instructor.name}&background=111&color=fff`;
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-primary font-bold">
                                    {item.instructor.name.charAt(0)}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{item.instructor.name}</span>
                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">{item.instructor.title}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-primary/10 text-primary">
                              {item.classes.length}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => setExpandedInstructor(isExpanded ? null : item.instructor.id)}
                              className={`p-2 rounded-lg transition-all ${
                                isExpanded ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-primary hover:bg-primary/5'
                              }`}
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={4} className="p-0 border-t-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-gray-50/50"
                                >
                                  <div className="p-6 space-y-6">
                                    {/* Availability Summary */}
                                    {item.availabilities?.length > 0 && (
                                      <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Clock className="w-3 h-3" /> Defined Working Hours
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {item.availabilities.map((a: any, i: number) => (
                                              <span key={i} className="text-[11px] bg-primary/5 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/10">
                                                {to12h(a.start_time)} – {to12h(a.end_time)}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Detailed Schedule Matrix */}
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Class Schedule</h3>
                                        <span className="text-[10px] text-gray-400 font-medium">Daily Matrix</span>
                                      </div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-gray-50/50">
                                            <TableHead className="w-[80px] text-[11px] font-bold uppercase text-gray-500">SN</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-gray-500">Time Range</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-gray-500">Program / Details</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-gray-500 text-right">Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {item.classes.length === 0 ? (
                                            <TableRow>
                                              <TableCell colSpan={4} className="text-center py-8 text-xs text-gray-400 italic">
                                                No classes assigned for this instructor
                                              </TableCell>
                                            </TableRow>
                                          ) : (
                                            item.classes
                                            .sort((a: any, b: any) => toMins(a.start_time) - toMins(b.start_time))
                                            .map((row: any, idx: number) => {
                                              const active = isOngoing(row.start_time, row.end_time);
                                              return (
                                                <TableRow key={idx} className="hover:bg-gray-50/50">
                                                  <TableCell className="text-xs font-medium text-gray-500">{idx + 1}</TableCell>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                      <span className="text-xs font-bold text-gray-700">
                                                        {to12h(row.start_time)} – {to12h(row.end_time)}
                                                      </span>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex flex-col">
                                                      {row.parent_program_title && (
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                                                          <BookOpen className="w-2.5 h-2.5" />
                                                          {row.parent_program_title}
                                                        </span>
                                                      )}
                                                      <span className="text-xs font-semibold text-gray-900">
                                                        {row.program_title}
                                                      </span>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {active ? (
                                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 animate-pulse border border-green-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        Ongoing
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        Scheduled
                                                      </span>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredSchedules.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={(page) => fetchSchedules(page)}
              />
            </div>
          )}
        </div>
      <Toaster richColors position="top-right" />
    </div>
  );
};

export default InstructorSchedulePage;

