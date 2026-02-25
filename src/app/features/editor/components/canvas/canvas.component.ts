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
  private resizeDirection = '';
  private lastMouseX = 0;
  private lastMouseY = 0;

  activeDropTarget = signal<string | null>(null);
  alignmentGuides = signal<{ id: string, type: 'v' | 'h' | 'spacing-v' | 'spacing-h', pos: number, size?: number, label?: string }[]>([]);


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

  public findContainerAt(x: number, y: number, excludeId?: string): string | undefined {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const id = el.id;
      if (id === excludeId) continue;
      const page = this.editor.activePage();
      if (id && page.elements[id]) {
        const wireEl = page.elements[id];
        if (wireEl && ['container', 'section', 'article', 'grid', 'flex', 'column'].includes(wireEl.type)) {
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
    const elements = this.editor.allElements().filter(el => el.id !== id);

    const currentX = (itemRect.left - canvasRect.left) / this.zoom;
    const currentY = (itemRect.top - canvasRect.top) / this.zoom;
    const currentW = itemRect.width / this.zoom;
    const currentH = itemRect.height / this.zoom;
    const currentRight = currentX + currentW;
    const currentBottom = currentY + currentH;
    const currentMidX = currentX + currentW / 2;
    const currentMidY = currentY + currentH / 2;

    const guides: any[] = [];
    const threshold = 5;

    const elementsWithPos = elements.map(el => ({
      el,
      abs: this.editor.getElementAbsolutePosition(el.id)
    }));

    elementsWithPos.forEach(item => {
      const el = item.el;
      const elX = item.abs.left;
      const elY = item.abs.top;
      const elW = el.styles.width;
      const elH = el.styles.height;
      const elRight = elX + elW;
      const elBottom = elY + elH;
      const elMidX = elX + elW / 2;
      const elMidY = elY + elH / 2;

      // Vertical alignment (X)
      if (Math.abs(elX - currentX) < threshold) guides.push({ id: `v-${el.id}-ll`, type: 'v', pos: elX });
      if (Math.abs(elRight - currentRight) < threshold) guides.push({ id: `v-${el.id}-rr`, type: 'v', pos: elRight });
      if (Math.abs(elMidX - currentMidX) < threshold) guides.push({ id: `v-${el.id}-cc`, type: 'v', pos: elMidX });
      // Cross alignment
      if (Math.abs(elRight - currentX) < threshold) guides.push({ id: `vCross-${el.id}-rl`, type: 'v', pos: elRight });
      if (Math.abs(elX - currentRight) < threshold) guides.push({ id: `vCross-${el.id}-lr`, type: 'v', pos: elX });

      // Horizontal alignment (Y)
      if (Math.abs(elY - currentY) < threshold) guides.push({ id: `h-${el.id}-tt`, type: 'h', pos: elY });
      if (Math.abs(elBottom - currentBottom) < threshold) guides.push({ id: `h-${el.id}-bb`, type: 'h', pos: elBottom });
      if (Math.abs(elMidY - currentMidY) < threshold) guides.push({ id: `h-${el.id}-cc`, type: 'h', pos: elMidY });
      // Cross alignment
      if (Math.abs(elBottom - currentY) < threshold) guides.push({ id: `hCross-${el.id}-bt`, type: 'h', pos: elBottom });
      if (Math.abs(elY - currentBottom) < threshold) guides.push({ id: `hCross-${el.id}-tb`, type: 'h', pos: elY });
    });

    // Spacing Guides (Check horizontal/vertical sequences)
    // Horizontal spacing (leftward neighbor sequence)
    const leftNeighbors = elementsWithPos.filter(item => (item.abs.left + item.el.styles.width) < currentX)
      .sort((a, b) => (b.abs.left + b.el.styles.width) - (a.abs.left + a.el.styles.width));

    if (leftNeighbors.length >= 2) {
      const b = leftNeighbors[0];
      const a = leftNeighbors[1];
      const dist1 = b.abs.left - (a.abs.left + a.el.styles.width);
      const dist2 = currentX - (b.abs.left + b.el.styles.width);
      if (dist1 > 10 && Math.abs(dist1 - dist2) < threshold) {
        guides.push({
          id: `spacing-x-left`,
          type: 'spacing-h',
          pos: currentY + currentH / 2,
          size: dist2,
          label: Math.round(dist2).toString()
        });
      }
    }

    // Vertical spacing (upward neighbor sequence)
    const topNeighbors = elementsWithPos.filter(item => (item.abs.top + item.el.styles.height) < currentY)
      .sort((a, b) => (b.abs.top + b.el.styles.height) - (a.abs.top + a.el.styles.height));

    if (topNeighbors.length >= 2) {
      const b = topNeighbors[0];
      const a = topNeighbors[1];
      const dist1 = b.abs.top - (a.abs.top + a.el.styles.height);
      const dist2 = currentY - (b.abs.top + b.el.styles.height);
      if (dist1 > 10 && Math.abs(dist1 - dist2) < threshold) {
        guides.push({
          id: `spacing-y-top`,
          type: 'spacing-v',
          pos: currentX + currentW / 2,
          size: dist2,
          label: Math.round(dist2).toString()
        });
      }
    }

    this.alignmentGuides.set(guides);
  }

  isAltPressed = signal(false);

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.altKey) this.isAltPressed.set(true);

    // Shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'c') this.editor.copyElement(this.editor.selectedElementId() || '');
      if (event.key === 'v') this.editor.pasteElement();
      if (event.key === 'x') {
        const id = this.editor.selectedElementId();
        if (id) {
          this.editor.copyElement(id);
          this.editor.deleteElement(id);
        }
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (!event.altKey) this.isAltPressed.set(false);
  }


  onDrop(event: any) {
    if (event.previousContainer === event.container) return;

    const type = event.item.data as ElementType;
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const page = this.editor.activePage();
      let x = (event.dropPoint.x - rect.left) / this.zoom;
      let y = (event.dropPoint.y - rect.top) / this.zoom;

      // Strict Boundary Clamping
      const elWidth = type === 'section' ? 1440 : (type === 'column' || type === 'article' ? 720 : 150); // Default widths from service
      const elHeight = type === 'section' ? 200 : (type === 'text' ? 40 : 100);

      x = Math.max(0, Math.min(x, 1440 - elWidth));
      y = Math.max(0, Math.min(y, page.height - elHeight));

      const parentId = this.findContainerAt(event.dropPoint.x, event.dropPoint.y);
      let finalX = x;
      let finalY = y;

      if (parentId) {
        const parentPos = this.editor.getElementAbsolutePosition(parentId);
        finalX -= parentPos.left;
        finalY -= parentPos.top;
      }

      this.editor.addElement(type, finalX, finalY, parentId);
      this.activeDropTarget.set(null);
    }
  }

  onDragEnded(event: CdkDragEnd, id: string) {
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    const rect = canvasEl.getBoundingClientRect();
    const itemRect = event.source.element.nativeElement.getBoundingClientRect();

    const page = this.editor.activePage();
    let newX = (itemRect.left - rect.left) / this.zoom;
    let newY = (itemRect.top - rect.top) / this.zoom;

    // Strict Boundary Clamping
    const elWidth = itemRect.width / this.zoom;
    const elHeight = itemRect.height / this.zoom;

    newX = Math.max(0, Math.min(newX, 1440 - elWidth));
    newY = Math.max(0, Math.min(newY, page.height - elHeight));

    const newParentId = this.findContainerAt(itemRect.left + itemRect.width / 2, itemRect.top + itemRect.height / 2, id);
    this.editor.reparentElement(id, newParentId, { left: newX, top: newY });

    // Auto-size parent if needed
    const parentId = this.editor.activePage().elements[id]?.parentId;
    if (parentId) {
      this.editor.updateContainerSize(parentId);
    }

    event.source.reset();
    this.alignmentGuides.set([]);
  }

  showContextMenu = false;
  menuPos = { x: 0, y: 0 };
  contextElementId = '';

  onContextMenu(event: MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    this.showContextMenu = true;
    this.contextElementId = id;
    this.menuPos = { x: event.clientX, y: event.clientY };
  }

  onDuplicate() {
    if (this.contextElementId) {
      this.editor.duplicateElement(this.contextElementId);
      this.showContextMenu = false;
    }
  }

  onDelete() {
    if (this.contextElementId) {
      this.editor.deleteElement(this.contextElementId);
      this.showContextMenu = false;
    }
  }

  @HostListener('window:click')
  closeMenus() {
    this.showContextMenu = false;
  }


  onCanvasClick(event: MouseEvent) {
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('canvas')) {
      this.editor.selectElement(null);
    }
  }

  startResize(event: MouseEvent, id: string, direction: string = 'br') {
    event.stopPropagation();
    event.preventDefault();
    this.isResizing = true;
    this.resizeId = id;
    this.resizeDirection = direction;
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

        const updates: any = {};
        const styles = { ...el.styles };

        const page = this.editor.activePage();
        const canvasWidth = 1440;
        const canvasHeight = page.height;

        if (this.resizeDirection.includes('e')) {
          updates.width = Math.max(10, styles.width + deltaX);
          // Clamp width so it doesn't exceed right boundary
          if (styles.left + updates.width > canvasWidth) {
            updates.width = canvasWidth - styles.left;
          }
        }
        if (this.resizeDirection.includes('w')) {
          const newWidth = Math.max(10, styles.width - deltaX);
          if (newWidth !== styles.width) {
            const newLeft = Math.max(0, styles.left + deltaX);
            // Re-calculate width based on clamped left
            updates.left = newLeft;
            updates.width = styles.width + (styles.left - newLeft);
          }
        }
        if (this.resizeDirection.includes('s')) {
          updates.height = Math.max(10, styles.height + deltaY);
          // Clamp height so it doesn't exceed bottom boundary
          if (styles.top + updates.height > canvasHeight) {
            updates.height = canvasHeight - styles.top;
          }
        }
        if (this.resizeDirection.includes('n')) {
          const newHeight = Math.max(10, styles.height - deltaY);
          if (newHeight !== styles.height) {
            const newTop = Math.max(0, styles.top + deltaY);
            // Re-calculate height based on clamped top
            updates.top = newTop;
            updates.height = styles.height + (styles.top - newTop);
          }
        }

        this.editor.updateStyles(this.resizeId, updates);

        if (el.parentId) {
          this.editor.updateContainerSize(el.parentId);
        }

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
