import { Component, OnInit } from '@angular/core';
import { FabService, FabConfig } from './services/fab.service';
import { Observable } from 'rxjs';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  fabConfig$: Observable<FabConfig>;

  constructor(private fabService: FabService) {
    addIcons({ add });
    this.fabConfig$ = this.fabService.fabConfig$;
  }

  ngOnInit() {
    // FAB will be controlled by individual pages
  }

  onFabClick(config: FabConfig) {
    if (config.action) {
      config.action();
    }
  }
}
