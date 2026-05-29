<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyIncome extends Model
{
    use HasFactory;

    protected $fillable = [
        'income_category_id',
        'amount',
        'income_date',
        'month',
        'year',
        'payment_method',
        'payer_name',
        'remarks',
    ];

    public function category()
    {
        return $this->belongsTo(IncomeCategory::class, 'income_category_id');
    }
}
