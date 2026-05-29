<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncomeCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class IncomeCategoryController extends Controller
{
    public function index()
    {
        $categories = IncomeCategory::orderBy('name')->get();
        return response()->json([
            'success' => true,
            'data'    => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:income_categories,name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $category = IncomeCategory::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data'    => $category,
        ], 201);
    }

    public function show(string $id)
    {
        $category = IncomeCategory::find($id);
        if (!$category) return response()->json(['success' => false, 'message' => 'Not found'], 404);
        return response()->json(['success' => true, 'data' => $category]);
    }

    public function update(Request $request, string $id)
    {
        $category = IncomeCategory::find($id);
        if (!$category) return response()->json(['success' => false, 'message' => 'Not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:income_categories,name,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $category->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data'    => $category,
        ]);
    }

    public function destroy(string $id)
    {
        $category = IncomeCategory::find($id);
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        // Check if has incomes
        if ($category->incomes()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category that has income records associated with it.',
            ], 422);
        }

        $category->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }
}
