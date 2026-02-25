import { Component, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
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

  alignmentGuides = signal<{ id: string, type: 'v' | 'h', pos: number }[]>([]);

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newZoom = Math.min(Math.max(0.1, this.zoom + delta), 5);
    this.zoom = newZoom;
  }

  onMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
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

  private findContainerAt(x: number, y: number): string | undefined {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const id = el.id;
      const page = this.editor.activePage();
      if (id && page.elements[id]) {
        const wireEl = page.elements[id];
        if (wireEl && ['container', 'section', 'article', 'grid', 'flex'].includes(wireEl.type)) {
          return id;
        }
      }
    }
    return undefined;
  }

  onDragMoved(event: CdkDragMove, id: string) {
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    const canvasRect = canvasEl.getBoundingClientRect();
    const itemRect = event.source.element.nativeElement.getBoundingClientRect();

    const guides: { id: string, type: 'v' | 'h', pos: number }[] = [];
    const elements = this.editor.allElements().filter(el => el.id !== id);

    const currentX = (itemRect.left - canvasRect.left) / this.zoom;
    const currentY = (itemRect.top - canvasRect.top) / this.zoom;
    const currentW = itemRect.width / this.zoom;
    const currentH = itemRect.height / this.zoom;
    const currentMidX = currentX + currentW / 2;
    const currentMidY = currentY + currentH / 2;

    const threshold = 5;

    elements.forEach(el => {
      const elRight = el.styles.left + el.styles.width;
      const elBottom = el.styles.top + el.styles.height;
      const elMidX = el.styles.left + el.styles.width / 2;
      const elMidY = el.styles.top + el.styles.height / 2;

      // Vertical alignment (X)
      if (Math.abs(el.styles.left - currentX) < threshold) guides.push({ id: `v-${el.id}-ll`, type: 'v', pos: el.styles.left });
      if (Math.abs(elRight - (currentX + currentW)) < threshold) guides.push({ id: `v-${el.id}-rr`, type: 'v', pos: elRight });
      if (Math.abs(elMidX - currentMidX) < threshold) guides.push({ id: `v-${el.id}-cc`, type: 'v', pos: elMidX });

      // Horizontal alignment (Y)
      if (Math.abs(el.styles.top - currentY) < threshold) guides.push({ id: `h-${el.id}-tt`, type: 'h', pos: el.styles.top });
      if (Math.abs(elBottom - (currentY + currentH)) < threshold) guides.push({ id: `h-${el.id}-bb`, type: 'h', pos: elBottom });
      if (Math.abs(elMidY - currentMidY) < threshold) guides.push({ id: `h-${el.id}-cc`, type: 'h', pos: elMidY });
    });

    this.alignmentGuides.set(guides);
  }

  onDrop(event: any) {
    if (event.previousContainer === event.container) return;

    const type = event.item.data as ElementType;
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      let x = (event.dropPoint.x - rect.left) / this.zoom;
      let y = (event.dropPoint.y - rect.top) / this.zoom;

      // Snapping
      if (this.editor.gridSettings().snapEnabled) {
        x = this.snap(x, 1440 / this.editor.gridSettings().sizeX);
        y = this.snap(y, 100);
      }

      // Boundary Check
      if (x < 0 || y < 0 || x > 1440 || y > 2000) {
        this.showBoundaryError();
        return;
      }

      const parentId = this.findContainerAt(event.dropPoint.x, event.dropPoint.y);
      this.editor.addElement(type, x, y, parentId);
    }
  }

  onDragEnded(event: CdkDragEnd, id: string) {
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    const rect = canvasEl.getBoundingClientRect();
    const itemRect = event.source.element.nativeElement.getBoundingClientRect();

    let newX = (itemRect.left - rect.left) / this.zoom;
    let newY = (itemRect.top - rect.top) / this.zoom;

    // Snapping
    if (this.editor.gridSettings().snapEnabled) {
      newX = this.snap(newX, 1440 / this.editor.gridSettings().sizeX);
      newY = this.snap(newY, 2000 / this.editor.gridSettings().sizeY);
    }

    // Boundary Check
    if (newX < 0 || newY < 0 || newX + (itemRect.width / this.zoom) > 1440 || newY + (itemRect.height / this.zoom) > 2000) {
      this.showBoundaryError();
      event.source.reset();
      return;
    }

    this.editor.updateStyles(id, { left: newX, top: newY });
    event.source.reset();
    this.alignmentGuides.set([]);
  }

  private snap(val: number, step: number): number {
    return Math.round(val / step) * step;
  }

  private showBoundaryError() {
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    canvasEl.classList.add('boundary-error');
    setTimeout(() => canvasEl.classList.remove('boundary-error'), 500);
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
