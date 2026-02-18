<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->notes()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'nullable|string',
            'reminder_date' => 'nullable|date',
            'is_completed' => 'nullable|boolean',
        ]);

        $note = $request->user()->notes()->create($data);

        return response()->json($note, 201);
    }

    public function update(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'body' => 'nullable|string',
            'reminder_date' => 'nullable|date',
            'is_notified' => 'nullable|boolean',
            'is_completed' => 'nullable|boolean',
        ]);

        $note->update($data);

        return response()->json($note);
    }

    public function destroy(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);
        $note->delete();

        return response()->json(['message' => 'Note deleted']);
    }

    private function authorizeNote(Request $request, Note $note): void
    {
        if ($note->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }
}
