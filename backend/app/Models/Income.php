<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Income extends Model
{
    protected $fillable = [
        'user_id',
        'jar_id',
        'amount',
        'category',
        'source',
        'received_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'received_at' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function jar()
    {
        return $this->belongsTo(Jar::class);
    }
}
