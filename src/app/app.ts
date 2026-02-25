import { Component } from '@angular/core';
import { NavbarComponent } from './features/editor/components/navbar/navbar.component';
import { SidebarComponent } from './features/editor/components/sidebar/sidebar.component';
import { CanvasComponent } from './features/editor/components/canvas/canvas.component';
import { PropertiesComponent } from './features/editor/components/properties/properties.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, SidebarComponent, CanvasComponent, PropertiesComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App { }
