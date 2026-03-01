import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-category-sort-popover',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './category-sort-popover.component.html',
  styleUrls: ['./category-sort-popover.component.scss'],
})
export class CategorySortPopoverComponent {
  @Input() currentSort: 'frequency' | 'name' = 'name';

  constructor(private popoverController: PopoverController) {
    addIcons({ checkmarkOutline });
  }

  selectSort(sortType: 'frequency' | 'name') {
    this.popoverController.dismiss({ sortType });
  }
}
