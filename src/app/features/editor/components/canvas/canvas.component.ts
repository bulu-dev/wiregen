import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { EditorService } from '../../../../core/services/editor.service';
import { ElementType, WireframeElement } from '../../../../core/models/element.model';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss'
})
export class CanvasComponent {
  editor = inject(EditorService);

  // Viewport state
  zoom = 1;
  translateX = 0;
  translateY = 0;

  // Interaction state
  private isResizing = false;
  private isPanning = false;
  private resizeId = '';
  private lastMouseX = 0;
  private lastMouseY = 0;

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newZoom = Math.min(Math.max(0.1, this.zoom + delta), 5);

    // Optional: Zoom towards mouse position
    // For now, simple zoom is enough for a start
    this.zoom = newZoom;
  }

  onMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && event.altKey)) { // Middle click or Alt+Left
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  resetView() {
    this.zoom = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  onDrop(event: any) {
    if (event.previousContainer === event.container) return;

    const type = event.item.data as ElementType;
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const x = (event.dropPoint.x - rect.left) / this.zoom;
      const y = (event.dropPoint.y - rect.top) / this.zoom;

      // Detect potential parent container
      const parentId = this.findContainerAt(event.dropPoint.x, event.dropPoint.y);
      this.editor.addElement(type, x, y, parentId);
    }
  }

  private findContainerAt(x: number, y: number): string | undefined {
    // Basic hit test to find the front-most container
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const id = el.id;
      if (id && this.editor.project().pages.find(p => p.id === this.editor.project().activePageId)?.elements[id]) {
        const wireEl = this.editor.project().pages.find(p => p.id === this.editor.project().activePageId)?.elements[id];
        if (wireEl && ['container', 'section', 'article', 'grid', 'flex'].includes(wireEl.type)) {
          return id;
        }
      }
    }
    return undefined;
  }

  onDragEnded(event: CdkDragEnd, id: string) {
    const { x, y } = event.distance;
    const el = this.editor.activePage().elements[id];
    if (el) {
      this.editor.updateStyles(id, {
        left: el.styles.left + (x / this.zoom),
        top: el.styles.top + (y / this.zoom)
      });
    }
    event.source.reset();
  }

  onCanvasClick(event: MouseEvent) {
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('canvas')) {
      this.editor.selectElement(null);
    }
  }

  startResize(event: MouseEvent, id: string) {
    event.stopPropagation();
    event.preventDefault();
    this.isResizing = true;
    this.resizeId = id;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizing && this.resizeId) {
      const el = this.editor.activePage().elements[this.resizeId];
      if (el) {
        const deltaX = (event.clientX - this.lastMouseX) / this.zoom;
        const deltaY = (event.clientY - this.lastMouseY) / this.zoom;

        this.editor.updateStyles(this.resizeId, {
          width: Math.max(20, el.styles.width + deltaX),
          height: Math.max(20, el.styles.height + deltaY)
        });

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
      }
    } else if (this.isPanning) {
      this.translateX += event.clientX - this.lastMouseX;
      this.translateY += event.clientY - this.lastMouseY;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isResizing = false;
    this.isPanning = false;
    this.resizeId = '';
  }
}
