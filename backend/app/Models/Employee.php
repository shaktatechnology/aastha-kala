<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'device_user_id',
        'phone',
        'address',
        'type',
        'salary_basis',
        'salary_amount',
        'percentage',
        'earns_fee_commission',
        'earns_income_commission',
        'joining_date',
        'status',
        'image',
    ];

    protected $casts = [
        'earns_fee_commission'   => 'boolean',
        'earns_income_commission' => 'boolean',
        'status'                 => 'boolean',
    ];

    public function instructor()
    {
        return $this->hasOne(Instructor::class);
    }

    public function salaryPayments()
    {
        return $this->hasMany(SalaryPayment::class);
    }
}
