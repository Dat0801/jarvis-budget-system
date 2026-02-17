<?php

namespace Database\Seeders;

use App\Models\User;
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

        $user = User::updateOrCreate(
            ['email' => 'user@jarvis.local'],
            [
                'name' => 'Jarvis User',
                'password' => Hash::make('ChangeMe123!'),
                'role' => 'user',
            ]
        );

        $user->assignRole($userRole);
    }
}
