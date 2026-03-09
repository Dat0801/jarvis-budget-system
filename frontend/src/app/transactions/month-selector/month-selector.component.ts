import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-month-selector',
  templateUrl: './month-selector.component.html',
  styleUrls: ['./month-selector.component.scss'],
  standalone: false,
})
export class MonthSelectorComponent implements OnInit {
  @Input() availableMonths: string[] = [];
  months: { key: string; label: string; selected: boolean }[] = [];

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.generateMonths();
  }

  generateMonths() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    for (let i = 0; i < 24; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      this.months.push({
        key: `${year}-${monthStr}`,
        label: `${monthNames[date.getMonth()]} ${year}`,
        selected: i === 0,
      });
    }
  }

  toggleMonth(index: number) {
    this.months[index].selected = !this.months[index].selected;
  }

  dismiss() {
    this.modalController.dismiss();
  }

  export() {
    const selectedMonths = this.months
      .filter(m => m.selected)
      .map(m => m.key);

    if (selectedMonths.length === 0) {
      return;
    }

    this.modalController.dismiss(selectedMonths);
  }
}
