<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Jar;
use Illuminate\Http\Request;

class JarController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->jars()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'balance' => 'nullable|numeric|min:0',
        ]);

        $jar = $request->user()->jars()->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'balance' => $data['balance'] ?? 0,
        ]);

        return response()->json($jar, 201);
    }

    public function update(Request $request, Jar $jar)
    {
        $this->authorizeJar($request, $jar);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $jar->update($data);

        return response()->json($jar);
    }

    public function destroy(Request $request, Jar $jar)
    {
        $this->authorizeJar($request, $jar);
        $jar->delete();

        return response()->json(['message' => 'Jar deleted']);
    }

    private function authorizeJar(Request $request, Jar $jar): void
    {
        if ($jar->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }
}
