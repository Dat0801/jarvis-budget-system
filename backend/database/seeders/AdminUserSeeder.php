<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Jar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $userRole = Role::firstOrCreate(['name' => 'user']);

        $admin = User::updateOrCreate(
            ['email' => 'admin@jarvis.local'],
            [
                'name' => 'Jarvis Admin',
                'password' => Hash::make('ChangeMe123!'),
                'role' => 'admin',
            ]
        );

        $admin->assignRole($adminRole);
        $admin->jars()->firstOrCreate(
            ['name' => 'Cash', 'wallet_type' => Jar::TYPE_WALLET],
            [
                'category' => null,
                'description' => null,
                'balance' => 0,
                'budget_date' => null,
                'repeat_this_budget' => false,
                'currency_unit' => 'VND',
                'notifications_enabled' => false,
            ]
        );

        $user = User::updateOrCreate(
            ['email' => 'user@jarvis.local'],
            [
                'name' => 'Jarvis User',
                'password' => Hash::make('ChangeMe123!'),
                'role' => 'user',
            ]
        );

        $user->assignRole($userRole);
        $user->jars()->firstOrCreate(
            ['name' => 'Cash', 'wallet_type' => Jar::TYPE_WALLET],
            [
                'category' => null,
                'description' => null,
                'balance' => 0,
                'budget_date' => null,
                'repeat_this_budget' => false,
                'currency_unit' => 'VND',
                'notifications_enabled' => false,
            ]
        );
    }
}
