import { Component } from '@angular/core';
import { DragDropModule, CdkDrag, CdkDragPreview } from '@angular/cdk/drag-drop';
import { ElementType } from '../../../../core/models/element.model';

interface SidebarItem {
  type: ElementType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [DragDropModule, CdkDrag, CdkDragPreview],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Elements</h2>
      </div>
      <div class="element-list">
        @for (item of items; track item.type) {
          <div class="element-item" 
               cdkDrag
               [cdkDragData]="item.type">
            <span class="icon">{{ item.icon }}</span>
            <span class="label">{{ item.label }}</span>
            
            <!-- Drag Preview -->
            <div *cdkDragPreview class="drag-preview">
              {{ item.label }}
            </div>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: white;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid var(--border);
      h2 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    }
    .element-list {
      padding: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .element-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: grab;
      background: white;
      transition: all 0.2s ease;
      
      &:hover { border-color: var(--primary); background: #eff6ff; }
      .icon { font-size: 1.25rem; }
      .label { font-size: 0.75rem; font-weight: 500; }
    }
    .drag-preview {
      padding: 12px 24px;
      background: var(--primary);
      color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      font-weight: 500;
      opacity: 0.9;
    }
  `]
})
export class SidebarComponent {
  items: SidebarItem[] = [
    { type: 'container', label: 'Container', icon: '📦' },
    { type: 'text', label: 'Text', icon: '📄' },
    { type: 'button', label: 'Button', icon: '🔘' },
    { type: 'input', label: 'Input', icon: '📝' },
    { type: 'rect', label: 'Rectangle', icon: '⬜' },
    { type: 'image', label: 'Image', icon: '🖼️' },
  ];
}
