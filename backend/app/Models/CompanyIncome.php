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
        'received_amount',
        'income_date',
        'month',
        'year',
        'payment_method',
        'payer_name',
        'payer_phone',
        'remarks',
        'discount',
        'return_amount',
        'bill_number',
    ];

    protected $casts = [
        'amount' => 'float',
        'received_amount' => 'float',
        'discount' => 'float',
        'return_amount' => 'float',
    ];

    public function category()
    {
        return $this->belongsTo(IncomeCategory::class, 'income_category_id');
    }

    public function items()
    {
        return $this->hasMany(CompanyIncomeItem::class, 'company_income_id');
    }
}
