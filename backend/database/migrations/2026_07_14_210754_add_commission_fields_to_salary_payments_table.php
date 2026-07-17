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
        Schema::table('salary_payments', function (Blueprint $table) {
            // Change payment_type to string so we can support 'commission'
            $table->string('payment_type', 50)->default('salary')->change();

            // Add commission fields
            $table->decimal('commission_gross', 10, 2)->nullable()->after('payment_type');
            $table->decimal('commission_vat', 10, 2)->nullable()->after('commission_gross');
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('commission_vat');
            $table->decimal('commission_collected_amount', 10, 2)->nullable()->after('commission_percentage');
            $table->string('commission_method', 50)->nullable()->after('commission_collected_amount');
            $table->string('commission_basis', 50)->nullable()->after('commission_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_payments', function (Blueprint $table) {
            $table->dropColumn([
                'commission_gross',
                'commission_vat',
                'commission_percentage',
                'commission_collected_amount',
                'commission_method',
                'commission_basis'
            ]);

            // Revert payment_type (we can change it back to enum but changing string to enum has caveats in SQLite,
            // so keeping it as string is safer, or we can just leave it as string in down() too)
        });
    }
};
