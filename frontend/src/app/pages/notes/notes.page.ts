import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Note, NoteService } from '../../services/note.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
})
export class NotesPage implements OnInit {
  notes: Note[] = [];
  title = '';
  body = '';
  reminderDate = '';

  constructor(private noteService: NoteService) {}

  ngOnInit(): void {
    this.loadNotes();
  }

  loadNotes(): void {
    this.noteService.list().subscribe((notes) => (this.notes = notes));
  }

  createNote(): void {
    this.noteService
      .create({ title: this.title, body: this.body, reminder_date: this.reminderDate })
      .subscribe(() => {
        this.title = '';
        this.body = '';
        this.reminderDate = '';
        this.loadNotes();
      });
  }
}
