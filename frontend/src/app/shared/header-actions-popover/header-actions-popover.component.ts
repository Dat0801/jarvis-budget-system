import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  walletOutline, 
  calendarClearOutline, 
  downloadOutline, 
  searchOutline,
  ellipsisVerticalOutline
} from 'ionicons/icons';

export interface HeaderAction {
  id: string;
  label: string;
  icon: string;
  handler: () => void;
}

@Component({
  selector: 'app-header-actions-popover',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './header-actions-popover.component.html',
  styleUrls: ['./header-actions-popover.component.scss'],
})
export class HeaderActionsPopoverComponent {
  @Input() actions: HeaderAction[] = [];

  constructor(private popoverController: PopoverController) {
    addIcons({ 
      walletOutline, 
      calendarClearOutline, 
      downloadOutline, 
      searchOutline,
      ellipsisVerticalOutline
    });
  }

  handleAction(action: HeaderAction) {
    action.handler();
    this.popoverController.dismiss();
  }
}
