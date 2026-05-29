<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyIncome;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CompanyIncomeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CompanyIncome::with('category');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('category', function($cq) use ($request) {
                    $cq->where('name', 'like', '%' . $request->search . '%');
                })
                ->orWhere('payer_name', 'like', '%' . $request->search . '%')
                ->orWhere('payment_method', 'like', '%' . $request->search . '%')
                ->orWhere('remarks', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('income_category_id')) {
            $query->where('income_category_id', $request->income_category_id);
        }

        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }

        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }

        $incomes = $query->latest('income_date')->paginate(10);

        // Total income for the current month/year filter
        $monthlyTotal = null;
        if ($request->filled('month') && $request->filled('year')) {
            $monthlyTotal = CompanyIncome::where('month', $request->month)
                ->where('year', $request->year)
                ->sum('amount');
        }

        return response()->json([
            'success'       => true,
            'data'          => $incomes,
            'monthly_total' => $monthlyTotal,
        ]);
    }

    /**
     * Get stored BS years.
     */
    public function getStoredYears()
    {
        $years = CompanyIncome::distinct()->orderBy('year', 'desc')->pluck('year');
        return response()->json([
            'success' => true,
            'data'    => $years,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'income_category_id' => 'required|exists:income_categories,id',
            'amount'             => 'required|numeric|min:0.01',
            'income_date'        => 'required|date',
            'month'              => 'required|integer|between:1,12',
            'year'               => 'required|integer|min:2070|max:2110',
            'payment_method'     => 'nullable|string|max:100',
            'payer_name'         => 'nullable|string|max:255',
            'remarks'            => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $income = CompanyIncome::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Income recorded successfully',
            'data'    => $income->load('category'),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $income = CompanyIncome::with('category')->find($id);

        if (!$income) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        return response()->json(['success' => true, 'view_filedata' => $income]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $income = CompanyIncome::find($id);

        if (!$income) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'income_category_id' => 'required|exists:income_categories,id',
            'amount'             => 'required|numeric|min:0.01',
            'income_date'        => 'required|date',
            'month'              => 'required|integer|between:1,12',
            'year'               => 'required|integer|min:2070|max:2110',
            'payment_method'     => 'nullable|string|max:100',
            'payer_name'         => 'nullable|string|max:255',
            'remarks'            => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $income->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Income updated successfully',
            'data'    => $income->load('category'),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $income = CompanyIncome::find($id);
        if (!$income) return response()->json(['success' => false, 'message' => 'Not found'], 404);
        $income->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }
}
