import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
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
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
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
  newDebtStartDate = '';
  newTotalMonths: number | null = null;
  newCurrentMonth: number | null = null;
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
  editDebtStartDate = '';
  editTotalMonths: number | null = null;
  editCurrentMonth: number | null = null;
  editBody = '';
  editReminderDate = '';
  editIsCompleted = false;
  editIsPayAll = false;

  isNewDebtStartDatePickerOpen = false;
  isEditDebtStartDatePickerOpen = false;
  tempDebtStartDate = '';

  tempReminderDate = '';
  isDatePickerOpen = false;
  datePickerMode: 'create' | 'edit' = 'create';
  isSubmitting = false;
  isLoadingNotes = false;
  expandedNotes: Set<number> = new Set();
  owedMonthsCache: Map<number, { label: string; amount: number; isOwed: boolean }[]> = new Map();

  constructor(
    private noteService: NoteService,
    private categoryService: CategoryService,
    private walletService: WalletService,
    private fabService: FabService,
    private modalController: ModalController,
    private alertController: AlertController
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

  // Debt Start Date Picker - New Note
  openNewDebtStartDatePicker(): void {
    this.tempDebtStartDate = this.newDebtStartDate || this.getTodayDate();
    this.isNewDebtStartDatePickerOpen = true;
  }

  closeNewDebtStartDatePicker(): void {
    this.isNewDebtStartDatePickerOpen = false;
  }

  confirmNewDebtStartDatePicker(): void {
    this.newDebtStartDate = this.tempDebtStartDate;
    this.isNewDebtStartDatePickerOpen = false;
  }

  // Debt Start Date Picker - Edit Note
  openEditDebtStartDatePicker(): void {
    this.tempDebtStartDate = this.editDebtStartDate || this.getTodayDate();
    this.isEditDebtStartDatePickerOpen = true;
  }

  closeEditDebtStartDatePicker(): void {
    this.isEditDebtStartDatePickerOpen = false;
  }

  confirmEditDebtStartDatePicker(): void {
    this.editDebtStartDate = this.tempDebtStartDate;
    this.isEditDebtStartDatePickerOpen = false;
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
      this.owedMonthsCache.clear(); // Clear cache when reloading notes
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

  getTotalInterest(note: Note): number {
    if (!note.interest_amount || !note.current_month) return 0;
    return note.interest_amount * note.current_month;
  }

  toggleNoteExpand(noteId: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedNotes.has(noteId)) {
      this.expandedNotes.delete(noteId);
    } else {
      const note = this.allNotes.find(n => n.id === noteId);
      if (note) {
        this.owedMonthsCache.set(noteId, this.calculateOwedMonths(note));
      }
      this.expandedNotes.add(noteId);
    }
  }

  private calculateOwedMonths(note: Note): { label: string; amount: number; isOwed: boolean }[] {
    if (!note.interest_amount) return [];
    
    const months: { label: string; amount: number; isOwed: boolean }[] = [];
    
    // Use debt_start_date as base if available, otherwise use reminder_date
    const baseDate = note.debt_start_date ? new Date(note.debt_start_date) : 
                    (note.reminder_date ? new Date(note.reminder_date) : null);
    
    if (!baseDate) return [];

    // Limit to 120 months (10 years) to prevent hanging if data is huge
    const monthsOwed = Math.min(note.current_month || 0, 120);
    
    for (let i = 0; i < monthsOwed; i++) {
      const monthDate = new Date(baseDate);
      
      // If using debt_start_date, we count forward. 
      // If using reminder_date, we count backward (backward is the old logic)
      if (note.debt_start_date) {
        monthDate.setMonth(baseDate.getMonth() + i);
      } else {
        monthDate.setMonth(baseDate.getMonth() - i);
      }
      
      const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      months.push({
        label: monthLabel,
        amount: note.interest_amount,
        isOwed: !note.is_completed
      });
    }

    // Always ensure the reminder_date month is included in the list for active debt notes
    if (!note.is_completed && note.reminder_date) {
      const reminderLabel = new Date(note.reminder_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      if (!months.some(m => m.label === reminderLabel)) {
        months.push({
          label: reminderLabel,
          amount: note.interest_amount || 0,
          isOwed: true
        });
      }
    }
    
    return months;
  }

  getOwedMonthsList(note: Note): { label: string; amount: number; isOwed: boolean }[] {
    return this.owedMonthsCache.get(note.id) || [];
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
    this.newDebtStartDate = '';
    this.newTotalMonths = null;
    this.newCurrentMonth = null;
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
    this.editDebtStartDate = note.debt_start_date || '';
    this.editTotalMonths = note.total_months || null;
    this.editCurrentMonth = note.current_month || null;
    this.editBody = note.body || '';
    this.editReminderDate = note.reminder_date || '';
    this.editIsCompleted = !!note.is_completed;
    this.editIsPayAll = false;
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
      is_pay_all: this.editIsPayAll,
    };

    if (this.editType === 'debt') {
      payload.category_id = this.editCategoryId;
      payload.jar_id = this.editJarId;
      payload.is_repeat = this.editIsRepeat;
      payload.debtor_name = this.editDebtorName;
      payload.amount = parseVndAmount(this.editAmount);
      payload.interest_rate = this.editInterestRate;
      payload.interest_amount = parseVndAmount(this.editInterestAmount);
      payload.debt_start_date = this.editDebtStartDate || null;
      payload.total_months = this.editTotalMonths;
      payload.current_month = this.editCurrentMonth;
    } else {
      payload.category_id = null;
      payload.jar_id = null;
      payload.is_repeat = false;
      payload.debtor_name = null;
      payload.amount = null;
      payload.interest_rate = null;
      payload.interest_amount = null;
      payload.debt_start_date = null;
      payload.total_months = null;
      payload.current_month = null;
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
      payload.debt_start_date = this.newDebtStartDate || null;
      payload.total_months = this.newTotalMonths;
      payload.current_month = this.newCurrentMonth;
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

  async toggleCompleted(note: Note): Promise<void> {
    const previous = note.is_completed;
    const isRepeat = note.is_repeat;

    // If marking as completed a debt note, ask for payment type
    if (note.type === 'debt' && !note.is_completed) {
      const months = this.calculateOwedMonths(note);
      const reminderMonthLabel = this.getReminderMonthLabel(note);
      
      const inputs: any[] = months.map((m, index) => ({
        type: 'checkbox',
        label: m.label + (m.label === reminderMonthLabel ? ' (Scheduled)' : ' (Past Debt)'),
        value: index,
        checked: m.label === reminderMonthLabel // Default check the scheduled one
      }));

      const alert = await this.alertController.create({
        header: 'Select Months to Pay',
        message: 'Choose which months you want to settle.',
        inputs: [
          {
            type: 'checkbox',
            label: 'ALL MONTHS',
            value: 'all',
            checked: false
          },
          ...inputs
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Confirm Payment',
            handler: (selectedValues: (number | string)[]) => {
              if (selectedValues.length === 0) return false;
              
              if (selectedValues.includes('all')) {
                this.performToggleCompleted(note, { payment_mode: 'all' });
                return true;
              }

              const isScheduledPaid = selectedValues.some(val => 
                typeof val === 'number' && months[val].label === reminderMonthLabel
              );
              const monthsPaid = selectedValues.filter(val => 
                typeof val === 'number' && months[val].label !== reminderMonthLabel
              ).length;

              this.performToggleCompleted(note, {
                is_scheduled_paid: isScheduledPaid,
                months_paid: monthsPaid
              });
              
              return true;
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.performToggleCompleted(note);
    }
  }

  private getReminderMonthLabel(note: Note): string {
    if (!note.reminder_date) return '';
    const date = new Date(note.reminder_date);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  private performToggleCompleted(note: Note, additionalPayload: any = {}): void {
    const previous = note.is_completed;
    const isRepeat = note.is_repeat;

    const payload: any = {
      is_completed: !note.is_completed,
      ...additionalPayload
    };

    this.noteService.update(note.id, payload).pipe(take(1)).subscribe({
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
