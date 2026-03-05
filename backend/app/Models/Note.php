<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'category_id',
        'jar_id',
        'debtor_name',
        'amount',
        'interest_rate',
        'interest_amount',
        'body',
        'reminder_date',
        'is_notified',
        'is_completed',
        'is_repeat',
        'has_transaction',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'reminder_date' => 'date',
        'is_notified' => 'boolean',
        'is_completed' => 'boolean',
        'is_repeat' => 'boolean',
        'has_transaction' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function jar()
    {
        return $this->belongsTo(Jar::class, 'jar_id');
    }
}
