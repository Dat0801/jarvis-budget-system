import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Note, NoteService } from '../../services/note.service';
import { FabService } from '../../services/fab.service';
import { finalize, take } from 'rxjs';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
})
export class NotesPage implements OnInit {
  notes: Note[] = [];
  allNotes: Note[] = [];
  selectedTab: 'all' | 'reminders' | 'archived' = 'all';
  searchTerm: string = '';
  isCreateNoteOpen = false;
  newTitle = '';
  newBody = '';
  newReminderDate = '';
  isSubmitting = false;
  isLoadingNotes = false;

  constructor(private noteService: NoteService, private fabService: FabService) {}

  ngOnInit(): void {
    this.loadNotes();
  }

  ionViewWillEnter(): void {
    this.fabService.showFab(() => this.openNewNoteModal(), 'add');
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab();
  }

  loadNotes(): void {
    this.isLoadingNotes = true;
    this.noteService.list().pipe(
      take(1),
      finalize(() => {
        this.isLoadingNotes = false;
      })
    ).subscribe((data) => {
      this.allNotes = data;
      this.filterNotes();
    });
  }

  filterNotes(): void {
    let filtered = this.allNotes;

    if (this.selectedTab === 'reminders') {
      filtered = filtered.filter(note => note.reminder_date && !note.is_completed);
    } else if (this.selectedTab === 'archived') {
      filtered = filtered.filter(note => note.is_completed);
    }

    if (this.searchTerm.trim()) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (note.body && note.body.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }

    this.notes = filtered;
  }

  selectTab(tab: 'all' | 'reminders' | 'archived'): void {
    this.selectedTab = tab;
    this.filterNotes();
  }

  onSearch(event: any): void {
    this.searchTerm = event.detail.value;
    this.filterNotes();
  }

  getStatusBadge(note: Note): { text: string; class: string } {
    if (note.is_completed) {
      return { text: 'DONE', class: 'badge-done' };
    }
    return { text: 'UPCOMING', class: 'badge-upcoming' };
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  openNewNoteModal(): void {
    this.isCreateNoteOpen = true;
  }

  closeNewNoteModal(): void {
    this.isCreateNoteOpen = false;
    this.newTitle = '';
    this.newBody = '';
    this.newReminderDate = '';
    this.isSubmitting = false;
  }

  submitNewNote(): void {
    const title = this.newTitle.trim();
    if (!title || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    this.noteService.create({
      title,
      body: this.newBody.trim() || undefined,
      reminder_date: this.newReminderDate || undefined,
    }).subscribe({
      next: (createdNote) => {
        this.allNotes = [createdNote, ...this.allNotes];
        this.filterNotes();
        this.closeNewNoteModal();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  toggleCompleted(note: Note): void {
    const previous = note.is_completed;

    this.noteService.update(note.id, {
      is_completed: !note.is_completed,
    }).pipe(take(1)).subscribe({
      next: (updatedNote) => {
        this.allNotes = this.allNotes.map((item) => item.id === note.id ? { ...item, ...updatedNote } : item);
        this.filterNotes();
      },
      error: () => {
        note.is_completed = previous;
      }
    });
  }

  deleteNote(note: Note): void {
    this.noteService.remove(note.id).pipe(take(1)).subscribe(() => {
      this.allNotes = this.allNotes.filter((item) => item.id !== note.id);
      this.filterNotes();
    });
  }
}
