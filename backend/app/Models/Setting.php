<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;


class Setting extends Model
{
        use HasFactory;

    protected $fillable = [
        'company_name',
        'email',
        'phone',
        'address',
        'location_map',
        'about_short',
        'about',
        'banner',
        'logo',
        'mission',
        'years_of_experience',
        'awards',
        'number_of_instructors',
        'number_of_students',
        'success_rate',
        'opening_hour',
        'closing_hour',
        'admission_fee',
        'youtube',
        'whatsapp_number',
        'vat_percentage'
    ];

    protected $casts = [
        'mission' => 'array', 
    ];
}
