<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyIncomeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_income_id',
        'income_category_id',
        'topic_name',
        'amount',
        'remarks',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function companyIncome()
    {
        return $this->belongsTo(CompanyIncome::class, 'company_income_id');
    }

    public function category()
    {
        return $this->belongsTo(IncomeCategory::class, 'income_category_id');
    }
}
