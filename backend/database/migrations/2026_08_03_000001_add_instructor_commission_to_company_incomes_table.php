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
        Schema::table('company_incomes', function (Blueprint $table) {
            $table->foreignId('instructor_id')->nullable()->after('income_category_id')->constrained('instructors')->nullOnDelete();
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('remarks');
            $table->decimal('commission_amount', 10, 2)->nullable()->after('commission_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_incomes', function (Blueprint $table) {
            $table->dropForeign(['instructor_id']);
            $table->dropColumn(['instructor_id', 'commission_percentage', 'commission_amount']);
        });
    }
};
