<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\InstructorController;
use App\Http\Controllers\Api\GalleryCategoryController;
use App\Http\Controllers\Api\GalleryController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProgramController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\InstructorAvailabilityController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DressHireController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentFeeController;
use App\Http\Controllers\Api\StudentEnrollmentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\SalaryPaymentController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\CompanyIncomeController;
use App\Http\Controllers\Api\IncomeCategoryController;
use App\Http\Controllers\Api\VoiceController;
// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/settings', [SettingController::class, 'show']);
Route::get('/instructors', [InstructorController::class, 'index']);
Route::post('/messages', [MessageController::class, 'store']);

Route::get('/galleries/position/{position}', [GalleryController::class, 'getByPosition']);
Route::get('/galleries', [GalleryController::class, 'index']);
Route::get('/gallery-categories', [GalleryCategoryController::class, 'index']);
Route::get('/gallery-categories/{id}', [GalleryCategoryController::class, 'show']);

Route::get('/testimonials', [TestimonialController::class, 'index']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{slug}', [EventController::class, 'showBySlug']);

Route::get('/programs', [ProgramController::class, 'index']);
Route::get('/programs/latest', [ProgramController::class, 'latest']);
Route::get('/programs/{id}', [ProgramController::class, 'show']);
Route::get('/programs/{id}/available-instructors', [ProgramController::class, 'availableInstructors']);

Route::post('/bookings', [BookingController::class, 'store']);

// Public: get remaining free time slots for an instructor (used in BookingModal)
Route::get('/instructor-availabilities/instructor/{id}/free-slots', [InstructorAvailabilityController::class, 'freeSlots']);

Route::get('/dress-hire', [DressHireController::class, 'index']);

// Voices
Route::get('/voices', [VoiceController::class, 'publicIndex']);
Route::get('/voices/featured', [VoiceController::class, 'featured']);
Route::get('/voices/about', [VoiceController::class, 'aboutVoice']);

// Admin Routes
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('settings', SettingController::class)->only(['index', 'update']);
    Route::get('/settings', [SettingController::class, 'show']);
    Route::post('/settings', [SettingController::class, 'storeOrUpdate']);

    Route::apiResource('instructors', InstructorController::class);
    Route::get('/instructors/{id}/schedule', [InstructorController::class, 'fullSchedule']);
    Route::get('/instructors-schedules', [InstructorController::class, 'allSchedules']);
    Route::get('/instructors/{id}/check-conflict', [InstructorController::class, 'checkConflict']);
    Route::apiResource('gallery-categories', GalleryCategoryController::class);
    Route::apiResource('galleries', GalleryController::class);
    Route::apiResource('testimonials', TestimonialController::class);
    Route::apiResource('events', EventController::class);
    Route::apiResource('programs', ProgramController::class);
    
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::get('/bookings/{id}/available-instructors', [BookingController::class, 'availableInstructors']);
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy']);

    Route::prefix('instructor-availabilities')->group(function () {
        Route::get('/instructor/{instructor_id}', [InstructorAvailabilityController::class, 'index']);
        Route::get('/instructor/{instructor_id}/free-slots', [InstructorAvailabilityController::class, 'freeSlots']);
        Route::post('/', [InstructorAvailabilityController::class, 'store']);
        Route::put('/{id}', [InstructorAvailabilityController::class, 'update']);
        Route::delete('/{id}', [InstructorAvailabilityController::class, 'destroy']);
    });

    Route::prefix('dress-hire')->group(function () {
        Route::get('/', [DressHireController::class, 'index']);
        Route::post('/', [DressHireController::class, 'store']);
        Route::post('/reorder', [DressHireController::class, 'reorder']);
        Route::put('/{id}', [DressHireController::class, 'update']);
        Route::delete('/{id}', [DressHireController::class, 'destroy']);
    });

    Route::apiResource('students', StudentController::class);
    Route::get('/student-management/enrollments', [StudentEnrollmentController::class, 'index']);
    Route::patch('/student-management/enrollments/{id}/status', [StudentEnrollmentController::class, 'updateStatus']);
    Route::get('/student-fees/schedules', [StudentFeeController::class, 'getSchedules']);
    Route::apiResource('student-fees', StudentFeeController::class);
    Route::get('/students/{studentId}/fee-info', [StudentFeeController::class, 'studentFeeInfo']);

    Route::apiResource('employees', EmployeeController::class);
    Route::get('/all-employees', [EmployeeController::class, 'all']);
    Route::get('/salary-payments/years', [SalaryPaymentController::class, 'getStoredYears']);
    Route::get('/salary-payments/calculate-commission', [SalaryPaymentController::class, 'calculateCommission']);
    Route::get('/salary-payments/calculate-commission-from-income', [SalaryPaymentController::class, 'calculateCommissionFromIncome']);
    Route::get('/salary-payments/pending-commissions', [SalaryPaymentController::class, 'pendingCommissions']);
    Route::post('/salary-payments/bulk-commission-payout', [SalaryPaymentController::class, 'bulkCommissionPayout']);
    Route::apiResource('salary-payments', SalaryPaymentController::class);

    // Shifts & Attendance
    Route::apiResource('shifts', \App\Http\Controllers\Api\ShiftController::class);
    Route::post('/shifts/assign', [\App\Http\Controllers\Api\ShiftController::class, 'assignShifts']);
    Route::get('/shifts/employee/{employee_id}', [\App\Http\Controllers\Api\ShiftController::class, 'getEmployeeShifts']);
    Route::get('/attendance', [\App\Http\Controllers\Api\AttendanceController::class, 'index']);
    Route::post('/attendance/process', [\App\Http\Controllers\Api\AttendanceController::class, 'processLogs']);
    Route::get('/attendance/fetch-logs', [\App\Http\Controllers\Api\AttendanceController::class, 'fetchFromDevice']);
    Route::get('/attendance/summary', [\App\Http\Controllers\Api\AttendanceController::class, 'getSummary']);
    Route::apiResource('expenses', ExpenseController::class);

    // Company Income
    Route::get('/company-incomes/years', [CompanyIncomeController::class, 'getStoredYears']);
    Route::apiResource('company-incomes', CompanyIncomeController::class);
    Route::apiResource('income-categories', IncomeCategoryController::class);

    // Voices
    Route::apiResource('voices', VoiceController::class);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
