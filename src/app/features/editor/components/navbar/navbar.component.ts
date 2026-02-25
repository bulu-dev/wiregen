import { Component, inject } from '@angular/core';
import { EditorService } from '../../../../core/services/editor.service';
import { ExportService } from '../../../../core/services/export.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  editor = inject(EditorService);
  exportService = inject(ExportService);

  onExport() {
    this.exportService.exportProject();
  }
}
