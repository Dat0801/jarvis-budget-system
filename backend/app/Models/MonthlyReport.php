<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlyReport extends Model
{
    protected $fillable = [
        'user_id',
        'month',
        'total_income',
        'total_expenses',
        'generated_at',
    ];

    protected $casts = [
        'month' => 'date',
        'total_income' => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'generated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
