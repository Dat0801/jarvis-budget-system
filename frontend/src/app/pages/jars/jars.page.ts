import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Jar, JarService } from '../../services/jar.service';

@Component({
  selector: 'app-jars',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './jars.page.html',
  styleUrls: ['./jars.page.scss'],
})
export class JarsPage implements OnInit {
  jars: Jar[] = [];
  name = '';
  description = '';

  constructor(private jarService: JarService) {}

  ngOnInit(): void {
    this.loadJars();
  }

  loadJars(): void {
    this.jarService.list().subscribe((jars) => (this.jars = jars));
  }

  createJar(): void {
    this.jarService
      .create({ name: this.name, description: this.description })
      .subscribe(() => {
        this.name = '';
        this.description = '';
        this.loadJars();
      });
  }
}
