<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add new columns to company_incomes
        Schema::table('company_incomes', function (Blueprint $table) {
            $table->decimal('discount', 10, 2)->default(0)->after('remarks');
            $table->decimal('return_amount', 10, 2)->default(0)->after('discount');
            $table->string('bill_number')->nullable()->after('return_amount');
            $table->unsignedBigInteger('income_category_id')->nullable()->change();
        });

        // 2. Create company_income_items table
        Schema::create('company_income_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_income_id')->constrained()->onDelete('cascade');
            $table->foreignId('income_category_id')->constrained();
            $table->decimal('amount', 15, 2);
            $table->string('remarks')->nullable();
            $table->timestamps();
        });

        // 3. Migrate existing records to company_income_items
        $incomes = DB::table('company_incomes')->get();
        foreach ($incomes as $income) {
            if ($income->income_category_id) {
                DB::table('company_income_items')->insert([
                    'company_income_id' => $income->id,
                    'income_category_id' => $income->income_category_id,
                    'amount'             => $income->amount,
                    'remarks'            => $income->remarks,
                    'created_at'         => $income->created_at ?? now(),
                    'updated_at'         => $income->updated_at ?? now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_income_items');

        Schema::table('company_incomes', function (Blueprint $table) {
            $table->dropColumn(['discount', 'return_amount', 'bill_number']);
            $table->unsignedBigInteger('income_category_id')->nullable(false)->change();
        });
    }
};
