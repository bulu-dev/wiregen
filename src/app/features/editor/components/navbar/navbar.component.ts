import { Component, inject } from '@angular/core';
import { EditorService } from '../../../../core/services/editor.service';
import { ExportService } from '../../../../core/services/export.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: `
    <nav class="navbar">
      <div class="logo">
        <span class="logo-icon">⚡</span>
        <h1>WireGen</h1>
      </div>
      <div class="project-info">
        <span class="project-name">{{ editor.project().name }}</span>
      </div>
      <div class="actions">
        <button class="btn btn-outline" (click)="editor.clearProject()">Clear</button>
        <button class="btn btn-outline">Preview</button>
        <button class="btn btn-primary" (click)="onExport()">Export</button>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      height: 60px;
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 100;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      h1 { font-size: 1.25rem; font-weight: 700; color: var(--primary); }
    }
    .logo-icon { font-size: 1.5rem; }
    .project-name { font-weight: 500; color: var(--text-muted); }
    .actions { display: flex; gap: 12px; }
    .btn {
      padding: 8px 16px;
      border-radius: var(--radius);
      font-weight: 500;
      font-size: 0.875rem;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-outline { background: white; border: 1px solid var(--border); color: var(--text-main); }
    .btn-outline:hover { background: var(--bg-main); }
  `]
})
export class NavbarComponent {
  editor = inject(EditorService);
  exportService = inject(ExportService);

  onExport() {
    this.exportService.exportProject();
  }
}
