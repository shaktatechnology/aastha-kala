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
        Schema::table('student_programs', function (Blueprint $table) {
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('custom_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_programs', function (Blueprint $table) {
            $table->dropColumn('commission_percentage');
        });
    }
};
