<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EventController extends Controller
{
    /**
     * GET /api/admin/events
     */
    public function index()
    {
        $events = Event::latest()->paginate(10);
        
        $events->getCollection()->transform(function ($event) {
            $event->banner = $this->getBannerUrl($event->banner);
            return $event;
        });

        return response()->json([
            'message' => 'Events fetched successfully',
            'data' => $events
        ]);
    }

    /**
     * POST /api/admin/events
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:events,slug',
            'description' => 'nullable|string',
            'banner' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
            'event_date' => 'required|date',
            'location' => 'required|string|max:255',
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_phone' => 'nullable|string|max:20',
            'status' => 'nullable|in:draft,published',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        if (empty($data['slug'])) {
            $data['slug'] = $this->generateUniqueSlug($data['title']);
        }

        if ($request->hasFile('banner')) {
            $data['banner'] = $request->file('banner')->store('events', 'public');
        }

        $event = Event::create($data);
        $event->banner = $this->getBannerUrl($event->banner);

        return response()->json([
            'message' => 'Event created successfully',
            'data' => $event
        ], 201);
    }

    /**
     * GET /api/admin/events/{event}
     */
    public function show(Event $event)
    {
        $event->banner = $this->getBannerUrl($event->banner);

        return response()->json([
            'message' => 'Event fetched successfully',
            'data' => $event
        ]);
    }

    /**
     * PUT /api/admin/events/{event}
     */
    public function update(Request $request, Event $event)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:events,slug,' . $event->id,
            'description' => 'nullable|string',
            'banner' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
            'event_date' => 'sometimes|date',
            'location' => 'sometimes|string|max:255',
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_phone' => 'nullable|string|max:20',
            'status' => 'sometimes|in:draft,published',
            'is_active' => 'sometimes|boolean',
            'remove_banner' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();

        if ($request->boolean('remove_banner')) {
            if ($event->banner) {
                Storage::disk('public')->delete($this->getStoragePath($event->banner));
            }
            $data['banner'] = null;
        }

        if ($request->hasFile('banner')) {
            if ($event->banner) {
                Storage::disk('public')->delete($this->getStoragePath($event->banner));
            }

            $data['banner'] = $request->file('banner')->store('events', 'public');
        }

        if ($request->filled('title') && !$request->filled('slug')) {
            $data['slug'] = $this->generateUniqueSlug($data['title'], $event->id);
        }

        $event->update($data);
        $event->banner = $this->getBannerUrl($event->banner);

        return response()->json([
            'message' => 'Event updated successfully',
            'data' => $event
        ]);
    }

    /**
     * DELETE /api/admin/events/{event}
     */
    public function destroy(Event $event)
    {
        if ($event->banner) {
                Storage::disk('public')->delete($this->getStoragePath($event->banner));
        }

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully'
        ]);
    }

    /**
     * PUBLIC: GET by slug
     */
    public function showBySlug($slug)
    {
        $event = Event::where('slug', $slug)->firstOrFail();

        $event->banner = $this->getBannerUrl($event->banner);

        return response()->json([
            'message' => 'Event fetched successfully',
            'data' => $event
        ]);
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug(string $title, $ignoreId = null): string
    {
        $baseSlug = Str::slug($title);
        $slug = $baseSlug;
        $i = 1;

        while (
            Event::where('slug', $slug)
                ->when($ignoreId, function ($query) use ($ignoreId) {
                    $query->where('id', '!=', $ignoreId);
                })
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $i++;
        }

        return $slug;
    }


    /**
     * Convert banner path to full URL for API responses
     */
    private function getBannerUrl($path)
    {
        if (!$path) {
            return null;
        }

        if (Str::startsWith($path, 'http')) {
            return $path;
        }

        return asset('storage/' . $path);
    }

    /**
     * Extract storage-relative path from either a full URL or a relative path.
     * Handles legacy records that stored full URLs and new records that store relative paths.
     */
    private function getStoragePath($path): string
    {
        if (!$path) return '';

        // Already a relative path (new format)
        if (!Str::startsWith($path, 'http')) {
            return $path;
        }

        // Legacy full URL — strip the storage URL prefix
        $storageUrl = rtrim(asset('storage'), '/') . '/';
        return Str::after($path, $storageUrl);
    }
}