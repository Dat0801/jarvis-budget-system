import { Component, OnInit } from '@angular/core';
import { FabService, FabConfig } from './services/fab.service';
import { Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  fabConfig$: Observable<FabConfig>;

  constructor(
    private fabService: FabService,
    private router: Router,
    private swUpdate: SwUpdate
  ) {
    addIcons({ add });
    this.fabConfig$ = this.fabService.fabConfig$;
    this.checkUpdate();
  }

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.sanitizeInteractionLayers();
      });

    this.sanitizeInteractionLayers();
  }

  private checkUpdate() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          if (confirm('New version available. Update now?')) {
            window.location.reload();
          }
        });
    }
  }

  onFabClick(config: FabConfig) {
    if (config.action) {
      config.action();
    }
  }

  private sanitizeInteractionLayers() {
    const backdrops = Array.from(document.querySelectorAll('ion-backdrop'));
    backdrops.forEach((backdrop) => {
      const hasOverlayParent = backdrop.closest('ion-modal, ion-alert, ion-action-sheet, ion-popover, ion-loading');
      if (!hasOverlayParent) {
        backdrop.remove();
      }
    });

    const outlets = Array.from(document.querySelectorAll<HTMLElement>('ion-router-outlet'));
    outlets.forEach((outlet) => {
      outlet.style.pointerEvents = 'auto';
    });
  }
}
