<?php

namespace App\Console\Commands;

use App\Models\Note;
use App\Notifications\DueNoteReminderNotification;
use Illuminate\Console\Command;

class NotifyDueNotes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notes:notify-due';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Notify users about due notes';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = now()->startOfDay();

        $notes = Note::query()
            ->with('user')
            ->whereDate('reminder_date', '<=', $today)
            ->where('is_notified', false)
            ->get();

        /** @var Note $note */
        foreach ($notes as $note) {
            $user = $note->user;

            if ($user && !empty($user->email)) {
                $user->notify(new DueNoteReminderNotification($note));
            }
            $note->update(['is_notified' => true]);
        }

        return self::SUCCESS;
    }
}
