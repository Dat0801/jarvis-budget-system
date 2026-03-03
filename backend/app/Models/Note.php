<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'debtor_name',
        'amount',
        'interest_rate',
        'interest_amount',
        'body',
        'reminder_date',
        'is_notified',
        'is_completed',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'reminder_date' => 'date',
        'is_notified' => 'boolean',
        'is_completed' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
