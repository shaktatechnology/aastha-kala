<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GalleryController extends Controller
{
    /**
     * Get all galleries
     */
    public function index()
    {
        $galleries = Gallery::with('category')->latest()->paginate(10);

        $galleries->getCollection()->transform(function ($gallery) {
            if (!empty($gallery->images)) {
                $gallery->images = array_map(function ($image) {
                    // If it's already a full URL, return as is
                    if (str_starts_with($image, 'http')) {
                        return $image;
                    }
                    return asset('storage/' . $image);
                }, $gallery->images);
            }
            return $gallery;
        });

        return response()->json([
            'success' => true,
            'data' => $galleries
        ]);
    }

    /**
     * Store gallery
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
            'type' => 'nullable|in:video,images',
            'category_id' => 'nullable|exists:gallery_categories,id',
            'description' => 'nullable|string',
            'position' => 'nullable|string',
            'video' => 'nullable|url',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ], [
            'type.in' => 'The selected type must be either video or images.',
            'category_id.exists' => 'The selected category does not exist.',
            'video.url' => 'The video must be a valid URL.',
            'images.array' => 'Images must be an array.',
            'images.*.image' => 'Each file must be an image.',
            'images.*.mimes' => 'Images must be jpeg, png, jpg, gif, or webp.',
            'images.*.max' => 'Each image must not exceed 5MB.',
        ]);

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('gallery', 'public');
                $imagePaths[] = $path;
            }
        }

        $gallery = Gallery::create([
            'title' => $request->title,
            'type' => $request->type,
            'category_id' => $request->category_id,
            'description' => $request->description,
            'position' => $request->position,
            'video' => $request->video,
            'images' => $imagePaths,
        ]);

        if (!empty($gallery->images)) {
            $gallery->images = array_map(function ($image) {
                if (str_starts_with($image, 'http')) {
                    return $image;
                }
                return asset('storage/' . $image);
            }, $gallery->images);
        }

        return response()->json([
            'success' => true,
            'message' => 'Gallery created successfully',
            'data' => $gallery
        ], 201);
    }

    /**
     * Show single gallery
     */
    public function show($id)
    {
        $gallery = Gallery::with('category')->findOrFail($id);

        if (!empty($gallery->images)) {
            $gallery->images = array_map(function ($image) {
                if (str_starts_with($image, 'http')) {
                    return $image;
                }
                return asset('storage/' . $image);
            }, $gallery->images);
        }

        return response()->json([
            'success' => true,
            'data' => $gallery
        ]);
    }

    /**
     * Update gallery
     */
public function update(Request $request, $id)
{
    $gallery = Gallery::findOrFail($id);

    $request->validate([
        'title' => 'nullable|string|max:255',
        'type' => 'nullable|in:video,images',
        'category_id' => 'nullable|exists:gallery_categories,id',
        'description' => 'nullable|string',
        'position' => 'nullable|string',
        'video' => 'nullable|url',
        'images' => 'nullable|array',
        'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        'removed_images' => 'nullable|array',
    ]);

    $existingImages = $gallery->images ?? [];

    // handle remove images
    $removedImages = $request->input('removed_images', []);

    if (!empty($removedImages)) {
        foreach ($removedImages as $removedImage) {
            $filename = basename($removedImage);
            
            Storage::disk('public')->delete('gallery/' . $filename);

            $existingImages = array_filter($existingImages, function ($img) use ($filename) {
                return basename($img) !== $filename;
            });
        }
    }

    
    if ($request->hasFile('images')) {

        foreach ($request->file('images') as $image) {
            $path = $image->store('gallery', 'public');
            $existingImages[] = $path;
        }
    }

    
        $gallery->update([
            'title' => $request->title,
            'type' => $request->type,
            'category_id' => $request->category_id,
            'description' => $request->description,
            'position' => $request->position,
            'video' => $request->video,
            'images' => array_values($existingImages),
        ]);

        if (!empty($gallery->images)) {
            $gallery->images = array_map(function ($image) {
                if (str_starts_with($image, 'http')) {
                    return $image;
                }
                return asset('storage/' . $image);
            }, $gallery->images);
        }

        return response()->json([
            'success' => true,
            'message' => 'Gallery updated successfully',
            'data' => $gallery
        ]);
    }

    /**
     * Delete gallery
     */
    public function destroy($id)
    {
        $gallery = Gallery::findOrFail($id);

        // Delete images from storage
        if (!empty($gallery->images)) {
            foreach ($gallery->images as $image) {
                Storage::disk('public')->delete($image);
            }
        }

        $gallery->delete();

        return response()->json([
            'message' => 'Gallery deleted successfully'
        ]);
    }

    /**
 * Get galleries by position
 */
public function getByPosition($position)
{
    $galleries = Gallery::with('category')
        ->where('position', $position)
        ->latest()
        ->get();

    $galleries->transform(function ($gallery) {
        if (!empty($gallery->images)) {
            $gallery->images = array_map(function ($image) {
                if (str_starts_with($image, 'http')) {
                    return $image;
                }
                return asset('storage/' . $image);
            }, $gallery->images);
        }
        return $gallery;
    });

    return response()->json($galleries);
}
}