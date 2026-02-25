import { Component, inject } from '@angular/core';
import { EditorService } from '../../../../core/services/editor.service';
import { ExportService } from '../../../../core/services/export.service';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  editor = inject(EditorService);
  exportService = inject(ExportService);
  dialog = inject(DialogService);

  onExport() {
    this.exportService.exportProject();
  }

  async onRenameProject() {
    const newName = await this.dialog.prompt(
      'Rename Project',
      'Enter a new name for your project:',
      this.editor.project().name
    );

    if (newName) {
      this.editor.renameProject(newName);
    }
  }
}
