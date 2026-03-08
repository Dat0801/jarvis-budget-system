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
  private configs: FabConfig[] = [];
  private fabConfigSubject = new BehaviorSubject<FabConfig>({
    show: false,
    icon: 'add',
    owner: undefined,
  });

  public fabConfig$: Observable<FabConfig> = this.fabConfigSubject.asObservable();

  constructor() {}

  setFabConfig(config: FabConfig) {
    if (config.owner) {
      this.configs = this.configs.filter(c => c.owner !== config.owner);
      if (config.show) {
        this.configs.push(config);
      }
    } else if (!config.show) {
      this.configs = [];
    }
    this.fabConfigSubject.next(config);
  }

  showFab(action: () => void, icon: string = 'add', owner: string = 'global') {
    const newConfig: FabConfig = {
      show: true,
      action,
      icon,
      owner,
    };
    
    // Remove any existing config with the same owner to avoid duplicates
    this.configs = this.configs.filter(c => c.owner !== owner);
    this.configs.push(newConfig);
    
    this.fabConfigSubject.next(newConfig);
  }

  hideFab(owner?: string) {
    if (!owner) {
      this.configs = [];
      this.fabConfigSubject.next({
        show: false,
        icon: 'add',
        owner: undefined,
      });
      return;
    }

    // Remove from stack
    const currentCount = this.configs.length;
    this.configs = this.configs.filter(c => c.owner !== owner);
    
    // If something was removed or if the current owner matches, update the subject
    if (this.configs.length > 0) {
      // Restore the last config in the stack
      this.fabConfigSubject.next(this.configs[this.configs.length - 1]);
    } else {
      this.fabConfigSubject.next({
        show: false,
        icon: 'add',
        owner: undefined,
      });
    }
  }
}
