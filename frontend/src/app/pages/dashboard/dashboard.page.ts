import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { JarService, Jar } from '../../services/jar.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  jars: Jar[] = [];
  totalBalance = 0;

  constructor(private jarService: JarService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.jarService.list().subscribe((jars) => {
      this.jars = jars;
      this.totalBalance = jars.reduce((sum, jar) => sum + Number(jar.balance), 0);
    });
  }
}
