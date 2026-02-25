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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
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
