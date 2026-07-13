<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class TestimonialController extends Controller
{
    // GET /api/admin/testimonials
    public function index()
    {
        $testimonials = Testimonial::latest()->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $testimonials
        ]);
    }

    // GET /api/admin/testimonials/{id}
    public function show($id)
    {
        $testimonial = Testimonial::find($id);

        if (!$testimonial) {
            return response()->json([
                'success' => false,
                'message' => 'Testimonial not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $testimonial
        ]);
    }

    // POST /api/admin/testimonials
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'title' => 'nullable|string',
            'description' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
            'order' => 'required|integer',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
        ], [
            'name.required' => 'Name is required.',
            'description.required' => 'Description is required.',
            'rating.required' => 'Rating is required.',
            'rating.integer' => 'Rating must be a number.',
            'rating.min' => 'Rating must be at least 1.',
            'rating.max' => 'Rating must not exceed 5.',
            'order.required' => 'Order is required.',
            'order.integer' => 'Order must be a number.',
            'image.image' => 'The file must be an image.',
            'image.mimes' => 'Image must be a file of type: jpg, jpeg, png.',
            'image.max' => 'Image size must not exceed 2MB.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only([
            'name',
            'title',
            'description',
            'rating',
            'order'
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('testimonials', 'public');
            $data['image'] = url('storage/' . $path);
        }

        $testimonial = Testimonial::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Testimonial created successfully',
            'data' => $testimonial
        ], 201);
    }

    // PUT /api/admin/testimonials/{id}
    public function update(Request $request, $id)
    {
    $testimonial = Testimonial::find($id);

    if (!$testimonial) {
        return response()->json([
            'success' => false,
            'message' => 'Testimonial not found'
        ], 404);
    }

    $validator = Validator::make($request->all(), [
        'name' => 'required|string',
        'title' => 'nullable|string',
        'description' => 'required|string',
        'rating' => 'required|integer|min:1|max:5',
        'order' => 'required|integer',
        'image' => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation errors',
            'errors' => $validator->errors()
        ], 422);
    }

    $data = $request->only([
        'name',
        'title',
        'description',
        'rating',
        'order'
    ]);

    
    if ($request->has('remove_image') && $request->remove_image == 1) {

        if ($testimonial->image) {
            $oldPath = str_replace(url('storage/'), '', $testimonial->image);
            Storage::disk('public')->delete($oldPath);
        }

        $data['image'] = null;
    }

    
    if ($request->hasFile('image')) {

        if ($testimonial->image) {
            $oldPath = str_replace(url('storage/'), '', $testimonial->image);
            Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('image')->store('testimonials', 'public');
        $data['image'] = url('storage/' . $path);
    }

    $testimonial->update($data);

    return response()->json([
        'success' => true,
        'message' => 'Testimonial updated successfully',
        'data' => $testimonial
    ]);
}

    // DELETE /api/admin/testimonials/{id}
    public function destroy($id)
    {
        $testimonial = Testimonial::find($id);

        if (!$testimonial) {
            return response()->json([
                'success' => false,
                'message' => 'Testimonial not found'
            ], 404);
        }

        if ($testimonial->image) {
            $oldPath = str_replace(url('storage/'), '', $testimonial->image);
            Storage::disk('public')->delete($oldPath);
        }

        $testimonial->delete();

        return response()->json([
            'success' => true,
            'message' => 'Testimonial deleted successfully'
        ]);
    }
}