import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { Note, NoteService } from '../../services/note.service';
import { CategoryService, CategoryTreeNode } from '../../services/category.service';
import { WalletService, Wallet } from '../../services/wallet.service';
import { FabService } from '../../services/fab.service';
import { CategoriesPage } from '../categories/categories.page';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { finalize, take } from 'rxjs';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent, CategoriesPage],
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
})
export class NotesPage implements OnInit {
  private readonly fabOwner = 'notes';
  notes: Note[] = [];
  allNotes: Note[] = [];
  categories: CategoryTreeNode[] = [];
  wallets: Wallet[] = [];
  selectedTab: 'all' | 'reminders' | 'archived' = 'all';
  searchTerm: string = '';
  isCreateNoteOpen = false;
  isEditNoteOpen = false;
  editingNote: Note | null = null;
  
  // New note form
  newType: 'general' | 'debt' = 'general';
  newTitle = '';
  newCategoryId: number | null = null;
  newCategoryName = '';
  newCategoryIcon = '';
  newJarId: number | null = null;
  newIsRepeat = false;
  newDebtorName = '';
  newAmount = '';
  newInterestRate: number | null = null;
  newInterestAmount = '';
  newBody = '';
  newReminderDate = '';

  // Edit note form
  editType: 'general' | 'debt' = 'general';
  editTitle = '';
  editCategoryId: number | null = null;
  editCategoryName = '';
  editCategoryIcon = '';
  editJarId: number | null = null;
  editIsRepeat = false;
  editDebtorName = '';
  editAmount = '';
  editInterestRate: number | null = null;
  editInterestAmount = '';
  editBody = '';
  editReminderDate = '';
  editIsCompleted = false;

  tempReminderDate = '';
  isDatePickerOpen = false;
  datePickerMode: 'create' | 'edit' = 'create';
  isSubmitting = false;
  isLoadingNotes = false;

  constructor(
    private noteService: NoteService,
    private categoryService: CategoryService,
    private walletService: WalletService,
    private fabService: FabService,
    private modalController: ModalController
  ) {}

  ngOnInit(): void {
    this.loadNotes();
    this.loadWallets();
  }

  loadWallets(): void {
    this.walletService.list().subscribe((data) => {
      this.wallets = data;
    });
  }

  async selectCategoryModal(mode: 'create' | 'edit' = 'create') {
    const modal = await this.modalController.create({
      component: CategoriesPage,
      componentProps: {
        isModal: true,
        initialTab: 'debtLoan',
        restrictTab: 'debtLoan',
        initialSelectMode: true,
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.categoryData) {
      const category = data.categoryData as CategoryTreeNode;
      if (mode === 'create') {
        this.newCategoryId = category.id;
        this.newCategoryName = category.name;
        this.newCategoryIcon = category.icon || 'cash-outline';
      } else {
        this.editCategoryId = category.id;
        this.editCategoryName = category.name;
        this.editCategoryIcon = category.icon || 'cash-outline';
      }
    }
  }

  get reminderDateDisplay(): string {
    return this.formatDateWithWeekday(this.newReminderDate);
  }

  get editReminderDateDisplay(): string {
    return this.formatDateWithWeekday(this.editReminderDate);
  }

  private formatDateWithWeekday(value: string): string {
    if (!value) {
      return 'Select date';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  openDatePicker(mode: 'create' | 'edit' = 'create'): void {
    this.datePickerMode = mode;
    this.tempReminderDate = (mode === 'create' ? this.newReminderDate : this.editReminderDate) || this.getTodayDate();
    this.isDatePickerOpen = true;
  }

  closeDatePicker(): void {
    this.isDatePickerOpen = false;
  }

  onDateValueChange(event: CustomEvent): void {
    const value = event.detail?.value;
    if (typeof value === 'string' && value.length > 0) {
      this.tempReminderDate = this.normalizeDateValue(value);
    }
  }

  confirmDatePicker(): void {
    const normalized = this.normalizeDateValue(this.tempReminderDate || this.getTodayDate());
    if (this.datePickerMode === 'create') {
      this.newReminderDate = normalized;
    } else {
      this.editReminderDate = normalized;
    }
    this.closeDatePicker();
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private normalizeDateValue(value: string): string {
    return value.split('T')[0];
  }

  ionViewWillEnter(): void {
    this.fabService.showFab(() => this.openNewNoteModal(), 'add', this.fabOwner);
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab(this.fabOwner);
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
        (note.title && note.title.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (note.category && note.category.name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getCalculatedInterest(amount: number | null | undefined, rate: number | null | undefined): number {
    if (!amount || !rate) return 0;
    return amount * (rate / 100);
  }

  onInterestRateChange(mode: 'create' | 'edit' = 'create'): void {
    const amountStr = mode === 'create' ? this.newAmount : this.editAmount;
    const rate = mode === 'create' ? this.newInterestRate : this.editInterestRate;
    const amount = parseVndAmount(amountStr);
    
    if (amount && rate !== null) {
      const calculated = amount * (rate / 100);
      const formatted = formatVndAmountInput(calculated.toFixed(0));
      if (mode === 'create') {
        this.newInterestAmount = formatted;
      } else {
        this.editInterestAmount = formatted;
      }
    }
  }

  onInterestAmountChange(mode: 'create' | 'edit' = 'create'): void {
    const amountStr = mode === 'create' ? this.newAmount : this.editAmount;
    const interestAmountStr = mode === 'create' ? this.newInterestAmount : this.editInterestAmount;
    const amount = parseVndAmount(amountStr);
    const interestAmount = parseVndAmount(interestAmountStr);
    
    if (amount && interestAmount !== null) {
      const rate = Number(((interestAmount / amount) * 100).toFixed(2));
      if (mode === 'create') {
        this.newInterestRate = rate;
      } else {
        this.editInterestRate = rate;
      }
    }
  }

  async onAmountInput(event: any, field: 'amount' | 'interestAmount', mode: 'create' | 'edit' = 'create'): Promise<void> {
    const ionInput = event.target as HTMLIonInputElement;
    const input = await ionInput.getInputElement();
    const originalValue = input.value || '';
    const digits = originalValue.replace(/\D/g, '');
    const formatted = formatVndAmountInput(digits);
    
    if (field === 'amount') {
      if (mode === 'create') {
        if (this.newAmount !== formatted) {
          this.newAmount = formatted;
          input.value = formatted;
          this.onInterestRateChange('create');
        }
      } else {
        if (this.editAmount !== formatted) {
          this.editAmount = formatted;
          input.value = formatted;
          this.onInterestRateChange('edit');
        }
      }
    } else {
      if (mode === 'create') {
        if (this.newInterestAmount !== formatted) {
          this.newInterestAmount = formatted;
          input.value = formatted;
          this.onInterestAmountChange('create');
        }
      } else {
        if (this.editInterestAmount !== formatted) {
          this.editInterestAmount = formatted;
          input.value = formatted;
          this.onInterestAmountChange('edit');
        }
      }
    }
  }

  openNewNoteModal(): void {
    this.isCreateNoteOpen = true;
    this.newType = 'general';
    this.newTitle = '';
    this.newCategoryId = null;
    this.newCategoryName = '';
    this.newCategoryIcon = '';
    this.newJarId = this.wallets.length > 0 ? this.wallets[0].id : null;
    this.newIsRepeat = false;
    this.newDebtorName = '';
    this.newAmount = '';
    this.newInterestRate = null;
    this.newInterestAmount = '';
    this.newBody = '';
    this.newReminderDate = '';
  }

  closeNewNoteModal(): void {
    this.isCreateNoteOpen = false;
  }

  openEditNoteModal(note: Note): void {
    this.editingNote = note;
    this.editType = note.type;
    this.editTitle = note.title || '';
    this.editCategoryId = note.category_id || null;
    this.editCategoryName = note.category?.name || '';
    this.editCategoryIcon = note.category?.icon || '';
    this.editJarId = note.jar_id || null;
    this.editIsRepeat = !!note.is_repeat;
    this.editDebtorName = note.debtor_name || '';
    this.editAmount = note.amount ? formatVndAmountInput(note.amount.toString()) : '';
    this.editInterestRate = note.interest_rate || null;
    this.editInterestAmount = note.interest_amount ? formatVndAmountInput(note.interest_amount.toString()) : '';
    this.editBody = note.body || '';
    this.editReminderDate = note.reminder_date || '';
    this.editIsCompleted = !!note.is_completed;
    this.isEditNoteOpen = true;
  }

  closeEditNoteModal(): void {
    this.isEditNoteOpen = false;
    this.editingNote = null;
  }

  saveEditNote(): void {
    if (!this.editingNote) return;
    if (this.editType === 'general' && !this.editTitle.trim()) return;
    if (this.editType === 'debt' && !this.editCategoryId) return;

    this.isSubmitting = true;
    const payload: any = {
      type: this.editType,
      title: this.editTitle,
      body: this.editBody,
      reminder_date: this.editReminderDate || null,
      is_completed: this.editIsCompleted,
    };

    if (this.editType === 'debt') {
      payload.category_id = this.editCategoryId;
      payload.jar_id = this.editJarId;
      payload.is_repeat = this.editIsRepeat;
      payload.debtor_name = this.editDebtorName;
      payload.amount = parseVndAmount(this.editAmount);
      payload.interest_rate = this.editInterestRate;
      payload.interest_amount = parseVndAmount(this.editInterestAmount);
    } else {
      payload.category_id = null;
      payload.jar_id = null;
      payload.is_repeat = false;
      payload.debtor_name = null;
      payload.amount = null;
      payload.interest_rate = null;
      payload.interest_amount = null;
    }

    this.noteService.update(this.editingNote.id, payload).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe((updatedNote) => {
      this.allNotes = this.allNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      this.filterNotes();
      this.closeEditNoteModal();
    });
  }

  submitNewNote(): void {
    if (this.newType === 'general' && !this.newTitle.trim()) return;
    if (this.newType === 'debt' && !this.newCategoryId) return;

    this.isSubmitting = true;
    const payload: any = {
      type: this.newType,
      title: this.newTitle,
      body: this.newBody,
      reminder_date: this.newReminderDate || null,
    };

    if (this.newType === 'debt') {
      payload.category_id = this.newCategoryId;
      payload.jar_id = this.newJarId;
      payload.is_repeat = this.newIsRepeat;
      payload.debtor_name = this.newDebtorName;
      payload.amount = parseVndAmount(this.newAmount);
      payload.interest_rate = this.newInterestRate;
      payload.interest_amount = parseVndAmount(this.newInterestAmount);
    }

    this.noteService.create(payload).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe((note) => {
      this.allNotes.unshift(note);
      this.filterNotes();
      this.closeNewNoteModal();
    });
  }

  toggleCompleted(note: Note): void {
    const previous = note.is_completed;
    const isRepeat = note.is_repeat;

    this.noteService.update(note.id, {
      is_completed: !note.is_completed,
    }).pipe(take(1)).subscribe({
      next: (updatedNote) => {
        if (isRepeat && !previous) {
          // If it was a repeating note and we marked it as completed,
          // a new note was created in the backend. We should reload the list.
          this.loadNotes();
        } else {
          this.allNotes = this.allNotes.map((item) => item.id === note.id ? { ...item, ...updatedNote } : item);
          this.filterNotes();
        }
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
