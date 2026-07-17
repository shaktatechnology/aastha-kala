<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_programs', function (Blueprint $table) {
            $table->unsignedInteger('duration_value')->nullable()->after('monthly_discount_type');
            $table->string('duration_unit')->nullable()->after('duration_value');
        });
    }

    public function down(): void
    {
        Schema::table('student_programs', function (Blueprint $table) {
            $table->dropColumn(['duration_value', 'duration_unit']);
        });
    }
};
