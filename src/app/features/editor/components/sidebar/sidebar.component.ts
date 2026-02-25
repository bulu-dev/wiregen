import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDrag, CdkDragPreview } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ElementType } from '../../../../core/models/element.model';

import { EditorService } from '../../../../core/services/editor.service';

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

  structureItems: SidebarItem[] = [
    { type: 'section', label: 'Section', icon: 'segment' },
    { type: 'article', label: 'Article', icon: 'article' },
    { type: 'flex', label: 'Flex Box', icon: 'view_quilt' },
    { type: 'grid', label: 'Grid Box', icon: 'grid_view' },
    { type: 'container', label: 'Container', icon: 'check_box_outline_blank' },
  ];

  basicItems: SidebarItem[] = [
    { type: 'text', label: 'Text', icon: 'title' },
    { type: 'button', label: 'Button', icon: 'smart_button' },
    { type: 'input', label: 'Input', icon: 'edit_note' },
    { type: 'image', label: 'Image', icon: 'image' },
    { type: 'rect', label: 'Rectangle', icon: 'rectangle' },
  ];

  addPage() {
    const name = prompt('Page Name:', 'New Page');
    if (name) this.editor.addPage(name);
  }
}
