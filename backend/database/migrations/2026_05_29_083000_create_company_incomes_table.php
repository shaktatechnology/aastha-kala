<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('company_incomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('income_category_id')->constrained();
            $table->decimal('amount', 15, 2);
            $table->date('income_date');
            $table->integer('month');              // Nepali BS month (1–12)
            $table->integer('year');               // Nepali BS year
            $table->string('payment_method')->nullable(); // Cash, Bank, eSewa, etc.
            $table->string('payer_name')->nullable();     // Who paid
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_incomes');
    }
};
