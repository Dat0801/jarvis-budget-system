import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FabConfig {
  show: boolean;
  action?: () => void;
  icon?: string;
  owner?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FabService {
  private fabConfigSubject = new BehaviorSubject<FabConfig>({
    show: false,
    icon: 'add',
    owner: undefined,
  });

  public fabConfig$: Observable<FabConfig> = this.fabConfigSubject.asObservable();

  constructor() {}

  setFabConfig(config: FabConfig) {
    this.fabConfigSubject.next(config);
  }

  showFab(action: () => void, icon: string = 'add', owner: string = 'global') {
    this.fabConfigSubject.next({
      show: true,
      action,
      icon,
      owner,
    });
  }

  hideFab(owner?: string) {
    const current = this.fabConfigSubject.value;
    if (owner && current.owner && current.owner !== owner) {
      return;
    }

    this.fabConfigSubject.next({
      show: false,
      icon: 'add',
      owner: undefined,
    });
  }
}
