<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class VoiceController extends Controller
{
    // ─── PUBLIC ──────────────────────────────────────────────────────────────

    /** GET /api/voices — all voices ordered by order */
    public function publicIndex()
    {
        $voices = Voice::orderBy('order')->get()->map(fn($v) => $this->transform($v));
        return response()->json(['success' => true, 'data' => $voices]);
    }

    /** GET /api/voices/featured — the featured voice for the homepage */
    public function featured()
    {
        $voice = Voice::where('is_featured', true)->orderBy('order')->first()
            ?? Voice::orderBy('order')->first();

        if (!$voice) {
            return response()->json(['success' => false, 'data' => null]);
        }

        return response()->json(['success' => true, 'data' => $this->transform($voice)]);
    }

    /** GET /api/voices/about — the voices for the about page (up to 3 non-featured voices) */
    public function aboutVoice()
    {
        $voices = Voice::where('is_featured', false)
            ->orderBy('order')
            ->take(3)
            ->get();

        if ($voices->isEmpty()) {
            $voices = Voice::orderBy('order')
                ->take(3)
                ->get();
        }

        if ($voices->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $transformed = $voices->map(fn($v) => $this->transform($v));

        return response()->json(['success' => true, 'data' => $transformed]);
    }

    // ─── ADMIN CRUD ───────────────────────────────────────────────────────────

    /** GET /api/admin/voices */
    public function index()
    {
        $voices = Voice::orderBy('order')->paginate(15);
        $voices->getCollection()->transform(fn($v) => $this->transform($v));
        return response()->json(['success' => true, 'data' => $voices]);
    }

    /** POST /api/admin/voices */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tagline'     => 'nullable|string|max:255',
            'name'        => 'nullable|string|max:255',
            'post'        => 'nullable|string|max:255',
            'paragraph'   => 'nullable|string',
            'order'       => 'nullable|integer|min:0',
            'is_featured' => 'nullable|boolean',
            'image'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['tagline', 'name', 'post', 'paragraph', 'order', 'is_featured']);
        $data['order'] = $data['order'] ?? 0;
        $data['is_featured'] = filter_var($data['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('voices', 'public');
            $data['image'] = url('storage/' . $path);
        }

        $voice = Voice::create($data);
        return response()->json(['success' => true, 'message' => 'Voice created', 'data' => $this->transform($voice)], 201);
    }

    /** GET /api/admin/voices/{voice} */
    public function show(Voice $voice)
    {
        return response()->json(['success' => true, 'data' => $this->transform($voice)]);
    }

    /** PUT /api/admin/voices/{voice} */
    public function update(Request $request, Voice $voice)
    {
        $validator = Validator::make($request->all(), [
            'tagline'     => 'nullable|string|max:255',
            'name'        => 'nullable|string|max:255',
            'post'        => 'nullable|string|max:255',
            'paragraph'   => 'nullable|string',
            'order'       => 'nullable|integer|min:0',
            'is_featured' => 'nullable|boolean',
            'image'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['tagline', 'name', 'post', 'paragraph', 'order', 'is_featured']);
        if (isset($data['is_featured'])) {
            $data['is_featured'] = filter_var($data['is_featured'], FILTER_VALIDATE_BOOLEAN);
        }

        if ($request->hasFile('image')) {
            // Delete old image
            if ($voice->image) {
                $old = str_replace(url('storage/'), '', $voice->image);
                if (Storage::disk('public')->exists($old)) {
                    Storage::disk('public')->delete($old);
                }
            }
            $path = $request->file('image')->store('voices', 'public');
            $data['image'] = url('storage/' . $path);
        }

        if ($request->boolean('remove_image')) {
            if ($voice->image) {
                $old = str_replace(url('storage/'), '', $voice->image);
                if (Storage::disk('public')->exists($old)) {
                    Storage::disk('public')->delete($old);
                }
            }
            $data['image'] = null;
        }

        $voice->update($data);
        return response()->json(['success' => true, 'message' => 'Voice updated', 'data' => $this->transform($voice)]);
    }

    /** DELETE /api/admin/voices/{voice} */
    public function destroy(Voice $voice)
    {
        if ($voice->image) {
            $old = str_replace(url('storage/'), '', $voice->image);
            if (Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }
        $voice->delete();
        return response()->json(['success' => true, 'message' => 'Voice deleted']);
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private function transform(Voice $v): array
    {
        return [
            'id'          => $v->id,
            'tagline'     => $v->tagline,
            'name'        => $v->name,
            'post'        => $v->post,
            'paragraph'   => $v->paragraph,
            'image'       => $v->image,
            'order'       => $v->order,
            'is_featured' => $v->is_featured,
            'created_at'  => $v->created_at,
        ];
    }
}
