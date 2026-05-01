<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Instructor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with('instructor')->latest();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('type') && in_array($request->type, ['staff', 'instructor'])) {
            $query->where('type', $request->type);
        }

        $employees = $query->paginate(10);
        
        $totalStaff = Employee::where('type', 'staff')->count();
        $totalInstructor = Employee::where('type', 'instructor')->count();
        $totalEmployees = Employee::count();

        return response()->json([
            'success' => true,
            'data' => $employees,
            'totalStaff' => $totalStaff,
            'totalInstructor' => $totalInstructor,
            'totalEmployees' => $totalEmployees
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:employees,email',
            'device_user_id' => 'nullable|string|unique:employees,device_user_id',
            'phone' => 'nullable|string|max:20|unique:employees,phone',
            'address' => 'nullable|string',
            'type' => 'required|in:staff,instructor',
            'salary_basis' => 'required|in:salary,percentage,none',
            'salary_amount' => 'nullable|numeric|min:0',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'joining_date' => 'nullable|date',
            'status' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            // Instructor specific fields
            'title' => 'required_if:type,instructor|string|max:255',
            'about' => 'nullable|string',
            'facebook_url' => 'nullable|url',
            'instagram_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $data = $request->only([
                'name', 'email', 'device_user_id', 'phone', 'address', 'type',
                'salary_basis', 'salary_amount', 'percentage',
                'joining_date', 'status'
            ]);

            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('employees', 'public');
                $data['image'] = asset('storage/' . $path);
            }

            $employee = Employee::create($data);

            if ($employee->type === 'instructor') {
                Instructor::create([
                    'employee_id' => $employee->id,
                    'name' => $employee->name,
                    'email' => $employee->email,
                    'phone' => $employee->phone,
                    'image' => $employee->image,
                    'title' => $request->title,
                    'about' => $request->about ?? '',
                    'facebook_url' => $request->facebook_url,
                    'instagram_url' => $request->instagram_url,
                ]);
            }

            DB::commit();

            // Register to ZKT device
            // Automatically queue registration for ZKT device via ADMS
            if (!empty($employee->device_user_id)) {
                // Remove spaces from name for device compatibility if necessary, 
                // or ensure proper spacing. Most ZKT devices prefer no spaces in raw ADMS commands.
                $deviceName = str_replace(' ', '_', $employee->name); 
                \App\Models\DeviceCommand::create([
                    'command' => "DATA USER PIN={$employee->device_user_id}\tName={$deviceName}\tPri=0\tPassword=\tGroup=1\tCard=0"
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $employee->load('instructor')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $employee = Employee::with(['instructor', 'salaryPayments'])->find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $employee
        ]);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:employees,email,' . $id,
            'device_user_id' => 'nullable|string|unique:employees,device_user_id,' . $id,
            'phone' => 'nullable|string|max:20|unique:employees,phone,' . $id,
            'address' => 'nullable|string',
            'type' => 'required|in:staff,instructor',
            'salary_basis' => 'required|in:salary,percentage,none',
            'salary_amount' => 'nullable|numeric|min:0',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'joining_date' => 'nullable|date',
            'status' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            // Instructor specific fields
            'title' => 'required_if:type,instructor|string|max:255',
            'about' => 'nullable|string',
            'facebook_url' => 'nullable|url',
            'instagram_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $data = $request->only([
                'name', 'email', 'device_user_id', 'phone', 'address', 'type',
                'salary_basis', 'salary_amount', 'percentage',
                'joining_date', 'status'
            ]);

            if ($request->hasFile('image')) {
                if ($employee->image) {
                    $oldPath = str_replace(asset('storage/'), '', $employee->image);
                    Storage::disk('public')->delete($oldPath);
                }
                $path = $request->file('image')->store('employees', 'public');
                $data['image'] = asset('storage/' . $path);
            }

            $employee->update($data);

            if ($employee->type === 'instructor') {
                $instructor = Instructor::where('employee_id', $employee->id)->first();
                if (!$instructor) {
                    $instructor = new Instructor();
                    $instructor->employee_id = $employee->id;
                }
                
                $instructor->name = $employee->name;
                $instructor->email = $employee->email;
                $instructor->phone = $employee->phone;
                $instructor->image = $employee->image;
                $instructor->title = $request->title;
                $instructor->about = $request->about ?? $instructor->about ?? '';
                $instructor->facebook_url = $request->facebook_url;
                $instructor->instagram_url = $request->instagram_url;
                $instructor->save();
            } else {
                // If type changed from instructor to staff, we might want to delete the instructor record or keep it?
                // Usually better to keep it but mark as inactive, or just leave it. 
                // For now, let's just leave it or handle it if necessary.
            }

            DB::commit();

            // Update to ZKT device
            /* 
            if (!empty($employee->device_user_id)) {
                $zktService = app(\App\Services\ZktDeviceService::class);
                $zktService->setUserInDevice($employee->id, $employee->device_user_id, $employee->name);
            }
            */

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $employee->load('instructor')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found'
            ], 404);
        }

        if ($employee->image) {
            $oldPath = str_replace(asset('storage/'), '', $employee->image);
            Storage::disk('public')->delete($oldPath);
        }

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    }

    public function all()
    {
        $employees = Employee::all();
        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    public function deleteFromDevice($id)
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found'
            ], 404);
        }

        try {
            /* 
            $zktService = app(\App\Services\ZktDeviceService::class);
            $zktService->removeUserFromDevice($employee->id);
            */
            
            $employee->delete();
            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete from device: ' . $e->getMessage()
            ], 500);
        }
    }
}
