<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyIncome;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CompanyIncomeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CompanyIncome::with(['category', 'items.category']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('category', function($cq) use ($request) {
                    $cq->where('name', 'like', '%' . $request->search . '%');
                })
                ->orWhereHas('items.category', function($iq) use ($request) {
                    $iq->where('name', 'like', '%' . $request->search . '%');
                })
                ->orWhere('payer_name', 'like', '%' . $request->search . '%')
                ->orWhere('payer_phone', 'like', '%' . $request->search . '%')
                ->orWhere('payment_method', 'like', '%' . $request->search . '%')
                ->orWhere('remarks', 'like', '%' . $request->search . '%')
                ->orWhere('bill_number', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('income_category_id')) {
            $catId = $request->income_category_id;
            $query->where(function($q) use ($catId) {
                $q->where('income_category_id', $catId)
                  ->orWhereHas('items', function($sub) use ($catId) {
                      $sub->where('income_category_id', $catId);
                  });
            });
        }

        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }

        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }

        // Calculate total matching the current filters (or overall if unfiltered)
        $monthlyTotal = (clone $query)->sum('amount');

        $incomes = $query->latest('income_date')->paginate(10);

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
            'income_date'        => 'required|date',
            'month'              => 'required|integer|between:1,12',
            'year'               => 'required|integer|min:2070|max:2110',
            'payment_method'     => 'nullable|string|max:100',
            'payer_name'         => 'nullable|string|max:255',
            'payer_phone'        => 'nullable|string|max:50',
            'remarks'            => 'nullable|string',
            'discount'           => 'nullable|numeric|min:0',
            'received_amount'    => 'nullable|numeric|min:0',
            'return_amount'      => 'nullable|numeric|min:0',
            'bill_number'        => 'nullable|string|max:100',
            'items'              => 'required|array|min:1',
            'items.*.income_category_id' => 'required_without:items.*.topic_name|nullable|exists:income_categories,id',
            'items.*.topic_name'         => 'required_without:items.*.income_category_id|nullable|string|max:255',
            'items.*.amount'             => 'required|numeric|min:0.01',
            'items.*.remarks'            => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // 1. Calculate net total and subtotal amounts
        $subtotal = collect($data['items'])->sum('amount');
        $discount = (float) ($data['discount'] ?? 0);
        $netAmount = max(0, $subtotal - $discount);
        $data['amount'] = $netAmount;
        $data['received_amount'] = isset($data['received_amount']) ? (float)$data['received_amount'] : $netAmount;
        if ($data['received_amount'] <= 0) {
            $data['received_amount'] = $netAmount;
        }

        // 2. Set the primary category for legacy/fallback lookups
        $data['income_category_id'] = $data['items'][0]['income_category_id'] ?? null;

        // 3. Auto-generate bill number if not provided
        if (empty($data['bill_number'])) {
            $latest = CompanyIncome::latest('id')->first();
            $nextId = $latest ? $latest->id + 1 : 1;
            $data['bill_number'] = 'INC-' . date('Ymd') . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);
        }

        // 4. Save parent and child items in transaction
        $income = DB::transaction(function () use ($data) {
            $itemsData = $data['items'];
            unset($data['items']);

            $income = CompanyIncome::create($data);

            foreach ($itemsData as $item) {
                $income->items()->create([
                    'income_category_id' => $item['income_category_id'] ?? null,
                    'topic_name'         => $item['topic_name'] ?? null,
                    'amount'             => $item['amount'],
                    'remarks'            => $item['remarks'] ?? null,
                ]);
            }

            return $income;
        });

        return response()->json([
            'success' => true,
            'message' => 'Income recorded successfully',
            'data'    => $income->load(['category', 'items.category']),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $income = CompanyIncome::with(['category', 'items.category'])->find($id);

        if (!$income) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $income]);
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
            'income_date'        => 'required|date',
            'month'              => 'required|integer|between:1,12',
            'year'               => 'required|integer|min:2070|max:2110',
            'payment_method'     => 'nullable|string|max:100',
            'payer_name'         => 'nullable|string|max:255',
            'payer_phone'        => 'nullable|string|max:50',
            'remarks'            => 'nullable|string',
            'discount'           => 'nullable|numeric|min:0',
            'received_amount'    => 'nullable|numeric|min:0',
            'return_amount'      => 'nullable|numeric|min:0',
            'bill_number'        => 'nullable|string|max:100',
            'items'              => 'required|array|min:1',
            'items.*.income_category_id' => 'required_without:items.*.topic_name|nullable|exists:income_categories,id',
            'items.*.topic_name'         => 'required_without:items.*.income_category_id|nullable|string|max:255',
            'items.*.amount'             => 'required|numeric|min:0.01',
            'items.*.remarks'            => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // 1. Calculate net total and subtotal amounts
        $subtotal = collect($data['items'])->sum('amount');
        $discount = (float) ($data['discount'] ?? 0);
        $netAmount = max(0, $subtotal - $discount);
        $data['amount'] = $netAmount;
        $data['received_amount'] = isset($data['received_amount']) ? (float)$data['received_amount'] : $netAmount;
        if ($data['received_amount'] <= 0) {
            $data['received_amount'] = $netAmount;
        }

        // 2. Set the primary category for legacy/fallback lookups
        $data['income_category_id'] = $data['items'][0]['income_category_id'] ?? null;

        // 3. Auto-generate bill number if not provided
        if (empty($data['bill_number'])) {
            $data['bill_number'] = $income->bill_number ?? ('INC-' . date('Ymd') . '-' . str_pad($income->id, 4, '0', STR_PAD_LEFT));
        }

        // 4. Update in transaction
        DB::transaction(function () use ($income, $data) {
            $itemsData = $data['items'];
            unset($data['items']);

            $income->update($data);

            // Re-sync items
            $income->items()->delete();

            foreach ($itemsData as $item) {
                $income->items()->create([
                    'income_category_id' => $item['income_category_id'] ?? null,
                    'topic_name'         => $item['topic_name'] ?? null,
                    'amount'             => $item['amount'],
                    'remarks'            => $item['remarks'] ?? null,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Income updated successfully',
            'data'    => $income->load(['category', 'items.category']),
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
