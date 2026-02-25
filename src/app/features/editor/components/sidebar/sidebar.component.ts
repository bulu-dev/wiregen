import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDrag, CdkDragPreview } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ElementType } from '../../../../core/models/element.model';

import { EditorService } from '../../../../core/services/editor.service';
import { DialogService } from '../../../../core/services/dialog.service';

export interface SidebarItem {
  type: ElementType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, DragDropModule, CdkDrag, CdkDragPreview, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  editor = inject(EditorService);
  dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  structureItems: SidebarItem[] = [
    { type: 'section', label: 'Section', icon: 'segment' },
    { type: 'container', label: 'Container', icon: 'check_box_outline_blank' },
  ];

  basicItems: SidebarItem[] = [
    { type: 'text', label: 'Text', icon: 'title' },
    { type: 'button', label: 'Button', icon: 'smart_button' },
    { type: 'image', label: 'Image', icon: 'image' },
    { type: 'rect', label: 'Rectangle', icon: 'rectangle' },
  ];

  expandedElements = new Set<string>();

  toggleExpand(id: string) {
    if (this.expandedElements.has(id)) {
      this.expandedElements.delete(id);
    } else {
      this.expandedElements.add(id);
    }
  }

  getElementLevel(id: string, elements: Record<string, any>, level = 0): number {
    const el = elements[id];
    if (el?.parentId && elements[el.parentId]) {
      return this.getElementLevel(el.parentId, elements, level + 1);
    }
    return level;
  }


  async addPage() {
    const name = await this.dialog.prompt('New Page', 'Enter a name for the new page:', 'New Page');
    if (name) this.editor.addPage(name);
  }

  async onDeletePage(id: string) {
    const confirmed = await this.dialog.confirm(
      'Delete Page',
      'Are you sure you want to delete this page and all its elements?',
      true
    );
    if (confirmed) {
      this.editor.deletePage(id);
    }
  }

  async onClearAll() {
    const confirmed = await this.dialog.confirm(
      'Clear Project',
      'Are you sure you want to clear the entire project? This cannot be undone.',
      true
    );

    if (confirmed) {
      this.editor.clearProject();
      if (this.isBrowser) {
        localStorage.removeItem('wiregen_project'); // Explicitly clear to be safe
      }
    }
  }
}
