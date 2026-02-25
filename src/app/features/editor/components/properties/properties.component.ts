import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../../../core/services/editor.service';

@Component({
    selector: 'app-properties',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <aside class="properties">
      <div class="properties-header">
        <h2>Properties</h2>
      </div>
      
      @if (editor.selectedElement(); as el) {
        <div class="properties-content">
          <div class="section">
            <h3>Identity</h3>
            <div class="field">
              <label>Name</label>
              <input type="text" [ngModel]="el.name" (ngModelChange)="editor.updateElement(el.id, { name: $event })">
            </div>
          </div>

          <div class="section">
            <h3>Layout</h3>
            <div class="grid">
              <div class="field">
                <label>X (Left)</label>
                <input type="number" [ngModel]="el.styles.left" (ngModelChange)="editor.updateStyles(el.id, { left: $event })">
              </div>
              <div class="field">
                <label>Y (Top)</label>
                <input type="number" [ngModel]="el.styles.top" (ngModelChange)="editor.updateStyles(el.id, { top: $event })">
              </div>
              <div class="field">
                <label>Width</label>
                <input type="number" [ngModel]="el.styles.width" (ngModelChange)="editor.updateStyles(el.id, { width: $event })">
              </div>
              <div class="field">
                <label>Height</label>
                <input type="number" [ngModel]="el.styles.height" (ngModelChange)="editor.updateStyles(el.id, { height: $event })">
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Appearance</h3>
            <div class="field" *ngIf="el.type !== 'text'">
              <label>Background</label>
              <input type="color" [ngModel]="el.styles.backgroundColor" (ngModelChange)="editor.updateStyles(el.id, { backgroundColor: $event })">
            </div>
            <div class="field" *ngIf="el.content !== undefined">
              <label>Content</label>
              <textarea [ngModel]="el.content" (ngModelChange)="editor.updateElement(el.id, { content: $event })"></textarea>
            </div>
          </div>
          
          <div class="actions">
            <button class="btn btn-danger" (click)="editor.deleteElement(el.id)">Delete Element</button>
          </div>
        </div>
      } @else {
        <div class="empty-state">
          <p>Select an element to edit its properties</p>
        </div>
      }
    </aside>
  `,
    styles: [`
    .properties {
      width: 300px;
      background: white;
      border-left: 1px solid var(--border);
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .properties-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      h2 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    }
    .properties-content {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }
    .section {
      margin-bottom: 24px;
      h3 { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 12px; }
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .field {
      margin-bottom: 12px;
      label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--text-main); margin-bottom: 4px; }
      input, textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--border);
        border-radius: 4px;
        font-size: 0.875rem;
        &:focus { outline: none; border-color: var(--primary); }
      }
      textarea { height: 80px; resize: vertical; }
    }
    .actions { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 20px; }
    .btn-danger { width: 100%; background: #fee2e2; color: #dc2626; padding: 10px; border-radius: var(--radius); font-weight: 500; }
    .btn-danger:hover { background: #fecaca; }
    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  `]
})
export class PropertiesComponent {
    editor = inject(EditorService);
}
