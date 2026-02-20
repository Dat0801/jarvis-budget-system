<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jar extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'category',
        'balance',
        'description',
        'color',
        'budget_date',
        'repeat_this_budget',
        'wallet_type',
        'currency_unit',
        'notifications_enabled',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'budget_date' => 'date',
        'repeat_this_budget' => 'boolean',
        'notifications_enabled' => 'boolean',
    ];

    public const TYPE_BUDGET = 'budget';
    public const TYPE_WALLET = 'wallet';

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function incomes()
    {
        return $this->hasMany(Income::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
