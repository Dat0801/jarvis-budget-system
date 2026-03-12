<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionCategory extends Model
{
    protected $fillable = [
        'type',
        'name',
        'icon',
        'parent_id',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(TransactionCategory::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(TransactionCategory::class, 'parent_id');
    }

    /**
     * Get all descendant category IDs including the current category ID.
     */
    public function getAllDescendantIds(): array
    {
        $ids = [$this->id];
        foreach ($this->children as $child) {
            $ids = array_merge($ids, $child->getAllDescendantIds());
        }
        return $ids;
    }

    /**
     * Get all descendant category names including the current category name.
     */
    public function getAllDescendantNames(): array
    {
        $names = [$this->name];
        foreach ($this->children as $child) {
            $names = array_merge($names, $child->getAllDescendantNames());
        }
        return array_unique($names);
    }

    public function jars()
    {
        return $this->belongsToMany(Jar::class, 'category_jar', 'transaction_category_id', 'jar_id');
    }
}
