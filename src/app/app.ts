import { Component, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { NavbarComponent } from './features/editor/components/navbar/navbar.component';
import { SidebarComponent } from './features/editor/components/sidebar/sidebar.component';
import { CanvasComponent } from './features/editor/components/canvas/canvas.component';
import { PropertiesComponent } from './features/editor/components/properties/properties.component';
import { DialogComponent } from './shared/components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, SidebarComponent, CanvasComponent, PropertiesComponent, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  constructor() {
    this.titleService.setTitle('WireGen | Professional Web Wireframe & Prototyping Tool');
    this.metaService.updateTag({
      name: 'description',
      content: 'WireGen is a high-performance, professional wireframe editor. Create web layouts, prototype ideas, and export production-ready HTML/CSS code instantly.'
    });
    this.metaService.updateTag({ property: 'og:title', content: 'WireGen - Professional Web Wireframe' });
  }
}
