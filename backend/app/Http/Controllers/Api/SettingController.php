<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use App\Models\Setting;
use App\Models\WhyUs;
use App\Models\SocialLinks;

class SettingController extends Controller
{
    // Fetch all settings
    public function show()
    {
        $setting = Setting::first();
        $social = SocialLinks::first();
        $whyUsList = WhyUs::orderBy('order')->get();

        if ($setting) {
            if ($setting->logo) $setting->logo = asset('storage/' . $setting->logo);
            if ($setting->banner) $setting->banner = asset('storage/' . $setting->banner);
            if (!$setting->mission) $setting->mission = [];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'setting' => $setting,
                'social_links' => $social,
                'why_us' => $whyUsList,
            ]
        ]);
    }

    // Store or update
    public function storeOrUpdate(Request $request)
    {
        return Setting::exists()
            ? $this->update($request)
            : $this->store($request);
    }

    // Store settings first time
    public function store(Request $request)
    {
        try {
            $request->validate([
                'company_name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'vat_percentage' => 'nullable|numeric|min:0|max:100',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }

        try {
            $data = $request->only([
                'company_name','email','phone','address','location_map',
                'about_short','about','mission','years_of_experience',
                'awards','number_of_instructors','number_of_students','success_rate',
                'opening_hour','closing_hour','admission_fee','vat_percentage'
            ]);

            // Ensure numeric fields are not null
            $numericFields = ['years_of_experience', 'awards', 'number_of_instructors', 'number_of_students', 'success_rate'];
            foreach ($numericFields as $field) {
                if (!isset($data[$field]) || $data[$field] === null || $data[$field] === "") {
                    $data[$field] = 0;
                }
            }

            
            if ($request->has('mission')) {
                $decodedMission = json_decode($request->mission, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data['mission'] = $decodedMission;
                }
            }

            $setting = Setting::create($data);

            // Files
            if ($request->hasFile('logo')) {
                $setting->logo = $request->file('logo')->store('settings', 'public');
            }

            if ($request->hasFile('banner')) {
                $setting->banner = $request->file('banner')->store('settings', 'public');
            }

            $setting->save();

            // Convert to URL
            if ($setting->logo) $setting->logo = asset('storage/' . $setting->logo);
            if ($setting->banner) $setting->banner = asset('storage/' . $setting->banner);

            // Social Links
            $social = SocialLinks::firstOrCreate([]);
            if ($request->has('social_links')) {
                $social->update($request->social_links);
            }

            // Why Us (NO DUPLICATION)
            if ($request->has('why_us')) {
                WhyUs::truncate(); 

                foreach ($request->why_us as $index => $wu) {
                    // Skip if both are empty
                    if (empty($wu['title']) && empty($wu['description'])) continue;
                    
                    WhyUs::create([
                        'title' => $wu['title'] ?? '',
                        'description' => $wu['description'] ?? null,
                        'order' => $index,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings created successfully',
                'data' => [
                    'setting' => $setting,
                    'social_links' => $social,
                    'why_us' => WhyUs::orderBy('order')->get(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error saving settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Update settings
    public function update(Request $request)
    {
        $setting = Setting::first();

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Settings not found'
            ], 404);
        }

        try {
            $request->validate([
                'company_name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'vat_percentage' => 'nullable|numeric|min:0|max:100',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }

        try {
            $data = $request->only([
                'company_name','email','phone','address','location_map',
                'about_short','about','mission','years_of_experience',
                'awards','number_of_instructors','number_of_students','success_rate',
                'opening_hour','closing_hour','admission_fee','vat_percentage'
            ]);

            // Ensure numeric fields are not null
            $numericFields = ['years_of_experience', 'awards', 'number_of_instructors', 'number_of_students', 'success_rate'];
            foreach ($numericFields as $field) {
                if (!isset($data[$field]) || $data[$field] === null || $data[$field] === "") {
                    $data[$field] = 0;
                }
            }

            
            if ($request->has('mission')) {
                $decodedMission = json_decode($request->mission, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data['mission'] = $decodedMission;
                }
            }

            $setting->update($data);

            // Files
            if ($request->hasFile('logo')) {
                if ($setting->logo) {
                    Storage::disk('public')->delete($setting->logo);
                }
                $setting->logo = $request->file('logo')->store('settings', 'public');
            }

            if ($request->hasFile('banner')) {
                if ($setting->banner) {
                    Storage::disk('public')->delete($setting->banner);
                }
                $setting->banner = $request->file('banner')->store('settings', 'public');
            }

            $setting->save();

            // Convert to URL
            if ($setting->logo) $setting->logo = asset('storage/' . $setting->logo);
            if ($setting->banner) $setting->banner = asset('storage/' . $setting->banner);

            // Social Links
            $social = SocialLinks::firstOrCreate([]);
            if ($request->has('social_links')) {
                $social->update($request->social_links);
            }

            if ($request->has('why_us')) {
                WhyUs::truncate();

                foreach ($request->why_us as $index => $wu) {
                    // Skip if both are empty
                    if (empty($wu['title']) && empty($wu['description'])) continue;

                    WhyUs::create([
                        'title' => $wu['title'] ?? '',
                        'description' => $wu['description'] ?? null,
                        'order' => $index,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => [
                    'setting' => $setting,
                    'social_links' => $social,
                    'why_us' => WhyUs::orderBy('order')->get(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}