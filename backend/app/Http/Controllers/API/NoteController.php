<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Income;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->notes()->latest()->get());
    }

    public function show(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);
        return response()->json($note);
    }

    public function reminderCount(Request $request)
    {
        $count = $request->user()
            ->notes()
            ->whereNotNull('reminder_date')
            ->where(function ($query) {
                $query->whereNull('is_completed')->orWhere('is_completed', false);
            })
            ->count();

        return response()->json(['count' => $count]);
    }

    public function dueReminders(Request $request)
    {
        $notes = $request->user()
            ->notes()
            ->whereNotNull('reminder_date')
            ->whereDate('reminder_date', '<=', now()->toDateString())
            ->where(function ($query) {
                $query->whereNull('is_completed')->orWhere('is_completed', false);
            })
            ->latest()
            ->get();

        return response()->json($notes);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'nullable|string|in:general,debt',
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'jar_id' => 'nullable|exists:jars,id',
            'debtor_name' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric',
            'interest_rate' => 'nullable|numeric',
            'interest_amount' => 'nullable|numeric',
            'body' => 'nullable|string',
            'reminder_date' => 'nullable|date',
            'is_completed' => 'nullable|boolean',
            'is_repeat' => 'nullable|boolean',
        ]);

        $note = $request->user()->notes()->create($data);

        return response()->json($note->load(['category', 'jar']), 201);
    }

    public function update(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);

        $data = $request->validate([
            'type' => 'sometimes|string|in:general,debt',
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'jar_id' => 'nullable|exists:jars,id',
            'debtor_name' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric',
            'interest_rate' => 'nullable|numeric',
            'interest_amount' => 'nullable|numeric',
            'body' => 'nullable|string',
            'reminder_date' => 'nullable|date',
            'is_notified' => 'nullable|boolean',
            'is_completed' => 'nullable|boolean',
            'is_repeat' => 'nullable|boolean',
        ]);

        $isMarkingCompleted = isset($data['is_completed']) && $data['is_completed'] && !$note->is_completed;

        // Prevent un-completing if it's a debt note and already has a transaction
        if ($note->has_transaction && isset($data['is_completed']) && !$data['is_completed']) {
            return response()->json([
                'message' => 'Cannot un-complete a note that already has an associated transaction.'
            ], 422);
        }

        if ($isMarkingCompleted && $note->type === 'debt' && !$note->has_transaction) {
            DB::transaction(function () use ($note, &$data) {
                // For debt notes, we create a transaction if there's an amount
                $amountToTransact = $note->interest_amount > 0 ? $note->interest_amount : $note->amount;
                
                if ($amountToTransact > 0) {
                    // ... Determine category name ...
                    $categoryName = 'Investment Returns'; // Default
                    if ($note->category_id) {
                        $categoryName = $note->category->name;
                    } elseif (isset($data['category_id'])) {
                        $categoryName = \App\Models\TransactionCategory::find($data['category_id'])->name;
                    }

                    // Determine Jar
                    $jarId = $data['jar_id'] ?? $note->jar_id;
                    if (!$jarId) {
                        $jar = Jar::where('user_id', $note->user_id)
                            ->where(function($q) {
                                $q->where('wallet_type', Jar::TYPE_WALLET)
                                  ->orWhereNull('wallet_type');
                            })
                            ->first();
                        $jarId = $jar ? $jar->id : null;
                    }

                    if ($jarId) {
                        $jar = Jar::find($jarId);
                        
                        // Create Income Transaction
                        Income::create([
                            'user_id' => $note->user_id,
                            'jar_id' => $jarId,
                            'amount' => $amountToTransact,
                            'category' => $categoryName,
                            'source' => 'Debt Note: ' . ($note->title ?? $categoryName),
                            'received_at' => now(),
                        ]);

                        // Update Jar Balance
                        $jar->increment('balance', $amountToTransact);

                        // Mark as having transaction
                        $data['has_transaction'] = true;
                    }
                }

                // Handle Repeat logic
                $isRepeat = $data['is_repeat'] ?? $note->is_repeat;
                if ($isRepeat) {
                    // Instead of resetting the current note, we keep it as completed
                    // and create a new note for the next month
                    $newNoteData = $note->getAttributes();
                    unset($newNoteData['id'], $newNoteData['created_at'], $newNoteData['updated_at']);
                    
                    $newNoteData['is_completed'] = false;
                    $newNoteData['is_notified'] = false;
                    $newNoteData['has_transaction'] = false; // Reset for the new note
                    
                    $currentDate = $note->reminder_date ? Carbon::parse($note->reminder_date) : now();
                    $newNoteData['reminder_date'] = $currentDate->addMonth()->toDateString();
                    
                    \App\Models\Note::create($newNoteData);
                    
                    // The current note remains completed
                    $data['is_completed'] = true;
                    // Keep the original reminder date for the completed note record
                    unset($data['reminder_date']);
                }
            });
        }

        $note->update($data);

        return response()->json($note->load(['category', 'jar']));
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
