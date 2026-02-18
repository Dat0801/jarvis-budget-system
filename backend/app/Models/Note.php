<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'body',
        'reminder_date',
        'is_notified',
        'is_completed',
    ];

    protected $casts = [
        'reminder_date' => 'date',
        'is_notified' => 'boolean',
        'is_completed' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
