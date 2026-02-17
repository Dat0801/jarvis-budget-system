# Jarvis Budget System

Fullstack workspace containing:

- backend/ (Laravel 11 + Inertia + Vue 3)
- frontend/ (Ionic + Angular)

This README provides step-by-step setup commands, configuration, and example scaffolding snippets.

## Prerequisites

- PHP 8.2+ with required extensions for Laravel
- Composer
- Node.js 18+ and npm
- Laravel installer or use Composer create-project
- Ionic CLI
- Android Studio (for Android builds)

## Backend Setup (Laravel 11 + Inertia + Vue 3)

### 1) Create project in backend folder

From the repository root:

```bash
composer create-project laravel/laravel backend "11.*"
cd backend
```

### 2) Install required packages

```bash
composer require inertiajs/inertia-laravel
composer require laravel/breeze --dev
composer require tymon/jwt-auth
composer require spatie/laravel-permission
composer require barryvdh/laravel-debugbar --dev
```

### 3) Install Breeze (Inertia + Vue)

```bash
php artisan breeze:install vue --inertia
npm install
npm run build
```

### 4) Create folder structure

```bash
mkdir -p app/Http/Controllers/API \
	app/Http/Controllers/Admin \
	app/Services \
	app/Repositories \
	app/Interfaces \
	app/DTOs
```

### 5) Configure .env (Supabase PostgreSQL example)

Create or update backend/.env:

```env
APP_NAME="Jarvis Budget System"
APP_ENV=local
APP_KEY=base64:GENERATED
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=YOUR_SUPABASE_HOST
DB_PORT=5432
DB_DATABASE=YOUR_DB_NAME
DB_USERNAME=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD

CORS_ALLOWED_ORIGINS=http://localhost:8100
JWT_SECRET=GENERATED
```

### 6) Configure CORS for mobile app

Update backend/config/cors.php:

```php
return [
		'paths' => ['api/*', 'sanctum/csrf-cookie'],
		'allowed_methods' => ['*'],
		'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', 'http://localhost:8100')],
		'allowed_origins_patterns' => [],
		'allowed_headers' => ['*'],
		'exposed_headers' => [],
		'max_age' => 0,
		'supports_credentials' => false,
];
```

### 7) JWT setup

Publish config and generate secret:

```bash
php artisan vendor:publish --provider="Tymon\\JWTAuth\\Providers\\LaravelServiceProvider"
php artisan jwt:secret
```

Update backend/config/auth.php:

```php
'guards' => [
		'web' => [
				'driver' => 'session',
				'provider' => 'users',
		],
		'api' => [
				'driver' => 'jwt',
				'provider' => 'users',
		],
],
```

### 8) Spatie Permission setup

```bash
php artisan vendor:publish --provider="Spatie\\Permission\\PermissionServiceProvider"
php artisan migrate
```

### 9) Migrations

Create migrations:

```bash
php artisan make:migration add_role_to_users_table --table=users
php artisan make:migration create_jars_table
php artisan make:migration create_incomes_table
php artisan make:migration create_expenses_table
php artisan make:migration create_notes_table
php artisan make:migration create_monthly_reports_table
```

Example migrations (snippets):

```php
// add_role_to_users_table
Schema::table('users', function (Blueprint $table) {
		$table->string('role')->default('user');
});

// create_jars_table
Schema::create('jars', function (Blueprint $table) {
		$table->id();
		$table->foreignId('user_id')->constrained()->cascadeOnDelete();
		$table->string('name');
		$table->decimal('balance', 12, 2)->default(0);
		$table->timestamps();
});
```

### 10) Scheduler for note reminders

Create command:

```bash
php artisan make:command NotifyDueNotes
```

Example command body:

```php
public function handle(): int
{
		$today = now()->startOfDay();

		$notes = Note::query()
				->whereDate('reminder_date', '<=', $today)
				->where('is_notified', false)
				->get();

		foreach ($notes as $note) {
				// TODO: send push/email notification here
				$note->update(['is_notified' => true]);
		}

		return self::SUCCESS;
}
```

Register scheduler in backend/app/Console/Kernel.php:

```php
protected function schedule(Schedule $schedule): void
{
		$schedule->command('notes:notify-due')->dailyAt('08:00');
}
```

### 11) Authentication strategy

- Admin (Inertia): session auth via `web` guard
- API (mobile): JWT auth via `api` guard
- Roles: `user`, `admin`

## Frontend Setup (Ionic + Angular)

### 1) Create Ionic project in frontend folder

From the repository root:

```bash
cd frontend
ionic start frontend tabs --type=angular
```

If the CLI creates its own folder named frontend, run from repo root:

```bash
ionic start frontend tabs --type=angular
```

### 2) Install required packages

```bash
npm install @capacitor/android @ionic/storage-angular @auth0/angular-jwt axios @capacitor/push-notifications
```

### 3) Add Android platform

```bash
npx cap add android
```

### 4) Create folder structure

```bash
mkdir -p src/app/services \
	src/app/guards \
	src/app/models \
	src/app/pages/auth \
	src/app/pages/dashboard \
	src/app/pages/jars \
	src/app/pages/income \
	src/app/pages/expense \
	src/app/pages/notes
```

## Example Backend API Controller (JWT)

Create backend/app/Http/Controllers/API/AuthController.php:

```php
<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
		public function register(Request $request)
		{
				$data = $request->validate([
						'name' => 'required|string|max:255',
						'email' => 'required|email|unique:users,email',
						'password' => 'required|string|min:8|confirmed',
				]);

				$user = User::create([
						'name' => $data['name'],
						'email' => $data['email'],
						'password' => Hash::make($data['password']),
						'role' => 'user',
				]);

				$token = auth('api')->login($user);

				return response()->json([
						'access_token' => $token,
						'token_type' => 'bearer',
						'expires_in' => auth('api')->factory()->getTTL() * 60,
						'user' => $user,
				]);
		}

		public function login(Request $request)
		{
				$credentials = $request->validate([
						'email' => 'required|email',
						'password' => 'required|string',
				]);

				if (! $token = auth('api')->attempt($credentials)) {
						return response()->json(['message' => 'Invalid credentials'], 401);
				}

				return response()->json([
						'access_token' => $token,
						'token_type' => 'bearer',
						'expires_in' => auth('api')->factory()->getTTL() * 60,
						'user' => auth('api')->user(),
				]);
		}
}
```

Example routes in backend/routes/api.php:

```php
use App\Http\Controllers\API\AuthController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
```

## Example Inertia Admin Page (Vue 3)

Create backend/resources/js/Pages/Admin/Dashboard.vue:

```vue
<script setup>
defineProps({
	totals: Object,
});
</script>

<template>
	<div class="p-6">
		<h1 class="text-2xl font-semibold">Admin Dashboard</h1>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
			<div class="rounded border p-4">
				<div class="text-sm text-gray-500">Total Users</div>
				<div class="text-2xl font-bold">{{ totals.users }}</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-sm text-gray-500">Total Income</div>
				<div class="text-2xl font-bold">{{ totals.income }}</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-sm text-gray-500">Total Expenses</div>
				<div class="text-2xl font-bold">{{ totals.expenses }}</div>
			</div>
		</div>
	</div>
</template>
```

## Example Ionic API Service (Angular)

Create frontend/src/app/services/api.service.ts:

```ts
import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';

@Injectable({ providedIn: 'root' })
export class ApiService {
	private client: AxiosInstance;

	constructor() {
		this.client = axios.create({
			baseURL: 'http://localhost/api',
		});
	}

	setToken(token: string | null): void {
		if (token) {
			this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
		} else {
			delete this.client.defaults.headers.common.Authorization;
		}
	}

	login(payload: { email: string; password: string }) {
		return this.client.post('/auth/login', payload);
	}

	register(payload: { name: string; email: string; password: string; password_confirmation: string }) {
		return this.client.post('/auth/register', payload);
	}
}
```

## Example JWT Login Flow (Frontend)

```ts
// Example usage in a login page or auth service
this.api.login({ email, password }).then((response) => {
	const token = response.data.access_token;
	this.api.setToken(token);
	// Persist token using Ionic Storage
});
```

## Business Logic Notes

- Expense cannot exceed jar balance.
- Expense deducts jar balance.
- Monthly reset logic should be in a scheduled command (cron-ready).
- Admin dashboard shows total users, total income, total expenses, and all transactions.

## Production-Ready Clean Architecture (Guidance)

- Controllers call Services.
- Services use Repositories (Interface + Implementation).
- DTOs for request/response shaping.
- API controllers return JSON only; Admin controllers return Inertia views.

## Run Commands

Backend:

```bash
cd backend
php artisan serve
```

Frontend:

```bash
cd frontend
ionic serve
```
