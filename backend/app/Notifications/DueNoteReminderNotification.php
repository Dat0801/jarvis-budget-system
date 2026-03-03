<?php

namespace App\Notifications;

use App\Models\Note;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DueNoteReminderNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Note $note)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $title = $this->note->title;
        $body = $this->note->body;
        $isDebt = $this->note->type === 'debt';

        $subject = $isDebt ? 'Jarvis Debt/Interest Reminder: ' . $title : 'Jarvis Reminder: ' . $title;

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting('Hi ' . ($notifiable->name ?? 'there') . ',')
            ->line($isDebt ? 'You have a debt or interest payment due today.' : 'You have a due note reminder in Jarvis Budget System.')
            ->line('Title: ' . $title);

        if ($isDebt) {
            if ($this->note->debtor_name) {
                $message->line('Debtor: ' . $this->note->debtor_name);
            }
            if ($this->note->amount) {
                $message->line('Amount: ' . number_format($this->note->amount, 0) . ' VND');
            }
            if ($this->note->interest_rate) {
                $message->line('Interest Rate: ' . $this->note->interest_rate . '%');
            }
            if ($this->note->interest_amount) {
                $message->line('Interest Amount: ' . number_format($this->note->interest_amount, 0) . ' VND');
            }
        }

        if (! empty($body)) {
            $message->line('Details: ' . $body);
        }

        return $message->line('Please review and mark it as completed when done.');
    }
}
