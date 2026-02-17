import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IncomeService } from '../../services/income.service';
import { Jar, JarService } from '../../services/jar.service';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './income.page.html',
  styleUrls: ['./income.page.scss'],
})
export class IncomePage implements OnInit {
  jarId: number | null = null;
  amount: number | null = null;
  source = '';
  receivedAt = '';
  jars: Jar[] = [];

  constructor(private incomeService: IncomeService, private jarService: JarService) {}

  ngOnInit(): void {
    this.loadJars();
  }

  loadJars(): void {
    this.jarService.list().subscribe((jars) => {
      this.jars = jars;
      if (!this.jarId && jars.length > 0) {
        this.jarId = jars[0].id;
      }
    });
  }

  submit(): void {
    if (!this.jarId || !this.amount) {
      return;
    }

    this.incomeService
      .create({
        jar_id: this.jarId,
        amount: this.amount,
        source: this.source || undefined,
        received_at: this.receivedAt || undefined,
      })
      .subscribe(() => {
        this.jarId = null;
        this.amount = null;
        this.source = '';
        this.receivedAt = '';
      });
  }
}
