<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Message;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentProgram;
use App\Models\DressHire;
use App\Models\Expense;
use App\Models\ProgramSchedule;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        $currentMonth = date('m');
        $currentYear = date('Y');

        $totalRevenueMtd = StudentFee::whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->sum('paid_amount');

        $outstandingFees = StudentFee::sum('pending_amount');

        $activeStudents = Student::where('status', 'active')->count();

        $dressHireCount = DressHire::count();
        
        $totalEmployees = \App\Models\Employee::count();

        $stats = [
            'total_bookings' => Booking::whereNull('student_id')->count(),
            'pending_bookings' => Booking::whereNull('student_id')->where('status', 'pending')->count(),
            'total_students' => $activeStudents,
            'total_employees' => $totalEmployees,
            'total_revenue' => StudentFee::sum('paid_amount'),
            'total_revenue_mtd' => $totalRevenueMtd,
            'outstanding_fees' => $outstandingFees,
            'dress_hire_count' => $dressHireCount,
        ];

        // Expense Category Data (replaces area chart)
        $expenseQuery = Expense::query();
        if ($request->has('expense_month') && $request->expense_month) {
            $expenseQuery->whereMonth('expense_date', $request->expense_month);
        }
        if ($request->has('expense_year') && $request->expense_year) {
            $expenseQuery->whereYear('expense_date', $request->expense_year);
        }
        $expenseCategories = $expenseQuery->select('category as name', DB::raw('SUM(amount) as value'))
            ->groupBy('category')
            ->get();

        // Employee Attendance
        $attendanceQuery = \App\Models\Attendance::query();
        if ($request->has('attendance_day') && $request->attendance_day) {
            $attendanceQuery->whereDay('date', $request->attendance_day);
        }
        if ($request->has('attendance_month') && $request->attendance_month) {
            $attendanceQuery->whereMonth('date', $request->attendance_month);
        }
        if ($request->has('attendance_year') && $request->attendance_year) {
            $attendanceQuery->whereYear('date', $request->attendance_year);
        }
        $employeeAttendance = $attendanceQuery->select('status as name', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get();
        // Capitalize status names
        $employeeAttendance = $employeeAttendance->map(function ($item) {
            return [
                'name' => ucfirst($item->name),
                'value' => $item->value
            ];
        });

        // Revenue Gauges
        $revenueGauges = StudentFee::with('program')
            ->select('program_id', DB::raw('SUM(total_amount) as total_expected'), DB::raw('SUM(paid_amount) as total_paid'))
            ->groupBy('program_id')
            ->get()
            ->filter(function ($item) {
                return $item->total_expected > 0;
            })
            ->map(function ($item) {
                $collected = round(($item->total_paid / $item->total_expected) * 100);
                return [
                    'program' => $item->program ? $item->program->title : 'Unknown',
                    'collected' => $collected
                ];
            })
            ->filter(function ($item) {
                return $item['collected'] > 0;
            })
            ->values();

        // Instructor Schedule
        $schedules = ProgramSchedule::with(['program', 'instructor'])
            ->limit(4)
            ->get()
            ->map(function ($item) {
                return [
                    'time' => substr($item->start_time, 0, 5),
                    'class' => $item->program ? $item->program->title : 'Unknown',
                    'instructor' => $item->instructor ? $item->instructor->name : 'Unknown'
                ];
            });

        // Recent Events (replaces Programs)
        $recentEvents = \App\Models\Event::orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'title' => $item->title,
                    'date' => \Carbon\Carbon::parse($item->event_date)->format('M d, Y'),
                    'location' => $item->location ?? 'N/A'
                ];
            });

        $recent_bookings = Booking::whereNull('student_id')
            ->with(['program', 'instructor'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $recent_messages = Message::orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'stats' => $stats,
                'expense_categories' => $expenseCategories,
                'employee_attendance' => $employeeAttendance,
                'revenue_gauges' => $revenueGauges,
                'schedules' => $schedules,
                'recent_events' => $recentEvents,
                'recent_bookings' => $recent_bookings,
                'recent_messages' => $recent_messages,
            ]
        ]);
    }
}
