import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FabConfig {
  show: boolean;
  action?: () => void;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FabService {
  private fabConfigSubject = new BehaviorSubject<FabConfig>({
    show: false,
    icon: 'add'
  });

  public fabConfig$: Observable<FabConfig> = this.fabConfigSubject.asObservable();

  constructor() {}

  setFabConfig(config: FabConfig) {
    this.fabConfigSubject.next(config);
  }

  showFab(action: () => void, icon: string = 'add') {
    this.fabConfigSubject.next({
      show: true,
      action,
      icon
    });
  }

  hideFab() {
    this.fabConfigSubject.next({
      show: false,
      icon: 'add'
    });
  }
}
