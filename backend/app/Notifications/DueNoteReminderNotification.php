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

        $message = (new MailMessage)
            ->subject('Jarvis Reminder: ' . $title)
            ->greeting('Hi ' . ($notifiable->name ?? 'there') . ',')
            ->line('You have a due note reminder in Jarvis Budget System.')
            ->line('Title: ' . $title);

        if (! empty($body)) {
            $message->line('Details: ' . $body);
        }

        return $message->line('Please review and mark it as completed when done.');
    }
}
