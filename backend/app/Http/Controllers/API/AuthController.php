<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Jar;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function googleLogin(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        try {
            \Log::info('Google Login Attempt', ['token' => substr($request->token, 0, 10) . '...']);
            $googleUser = Socialite::driver('google')->stateless()->userFromToken($request->token);
            \Log::info('Google User Found', ['email' => $googleUser->getEmail()]);
            
            $user = User::where('email', $googleUser->getEmail())->first();

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'role' => 'user',
                    'password' => null, // Social login users don't need password initially
                ]);

                // Initialize default jar for new user
                $user->jars()->create([
                    'name' => 'Cash',
                    'category' => null,
                    'description' => null,
                    'balance' => 0,
                    'budget_date' => null,
                    'repeat_this_budget' => false,
                    'wallet_type' => Jar::TYPE_WALLET,
                    'currency_unit' => 'VND',
                    'notifications_enabled' => false,
                ]);
            } else {
                // Update user info if already exists
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ]);
            }

            $token = auth('api')->login($user);

            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth('api')->factory()->getTTL() * 60,
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            \Log::error('Google Auth Error: ' . $e->getMessage(), [
                'exception' => $e,
                'token' => substr($request->token, 0, 10) . '...'
            ]);
            return response()->json(['message' => 'Google authentication failed: ' . $e->getMessage()], 401);
        }
    }

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

        $user->jars()->create([
            'name' => 'Cash',
            'category' => null,
            'description' => null,
            'balance' => 0,
            'budget_date' => null,
            'repeat_this_budget' => false,
            'wallet_type' => Jar::TYPE_WALLET,
            'currency_unit' => 'VND',
            'notifications_enabled' => false,
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

    public function logout(Request $request)
    {
        auth('api')->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    public function me(Request $request)
    {
        return response()->json(auth('api')->user());
    }
}
