<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Voice extends Model
{
    use HasFactory;

    protected $fillable = [
        'tagline',
        'name',
        'post',
        'paragraph',
        'image',
        'order',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'order' => 'integer',
    ];
}
