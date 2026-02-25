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
  template: `
    <main class="canvas-container" 
          (click)="onCanvasClick($event)"
          (wheel)="onWheel($event)"
          (mousedown)="onMouseDown($event)">
      
      <div class="canvas-viewport"
           [style.transform]="'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + zoom + ')'">
        <div class="canvas" 
             id="canvas-list"
             cdkDropList
             [cdkDropListConnectedTo]="[]"
             (cdkDropListDropped)="onDrop($event)">
          @for (el of editor.allElements(); track el.id) {
            <div class="element"
                 [@fadeIn]
                 [id]="el.id"
                 [class.selected]="editor.selectedElementId() === el.id"
                 [style.width.px]="el.styles.width"
                 [style.height.px]="el.styles.height"
                 [style.top.px]="el.styles.top"
                 [style.left.px]="el.styles.left"
                 [style.background-color]="el.styles.backgroundColor"
                 [style.borderRadius.px]="el.styles.borderRadius"
                 [style.color]="el.styles.color"
                 [style.fontSize.px]="el.styles.fontSize"
                 [style.fontWeight]="el.styles.fontWeight"
                 [style.border-width.px]="el.styles.borderWidth"
                 [style.border-color]="el.styles.borderColor"
                 [style.border-style]="el.styles.borderWidth ? 'solid' : 'transparent'"
                 [style.justify-content]="el.styles.justifyContent"
                 [style.align-items]="el.styles.alignItems"
                 [style.gap.px]="el.styles.gap"
                 [style.padding.px]="el.styles.padding"
                 (mousedown)="$event.stopPropagation(); editor.selectElement(el.id)"
                 cdkDrag
                 [cdkDragBoundary]="'.canvas'"
                 (cdkDragEnded)="onDragEnded($event, el.id)">
              
              <div class="element-content" [class.no-pointer]="el.type !== 'container'">
                @if (el.type === 'text' || el.type === 'button') {
                  {{ el.content }}
                } @else if (el.type === 'input') {
                  <input type="text" [placeholder]="el.placeholder || 'Enter text...'" disabled>
                } @else if (el.type === 'image') {
                  @if (el.imageUrl) {
                    <img [src]="el.imageUrl" style="width: 100%; height: 100%; object-fit: cover;">
                  } @else {
                    <div class="image-placeholder">🖼️</div>
                  }
                }
              </div>

              @if (editor.selectedElementId() === el.id) {
                <div class="resize-handle bottom-right" (mousedown)="startResize($event, el.id)"></div>
              }
            </div>
          }
        </div>
      </div>

      <div class="canvas-actions">
        <span>Zoom: {{ (zoom * 100).toFixed(0) }}% | Pan: {{ translateX.toFixed(0) }}, {{ translateY.toFixed(0) }}</span>
        <button class="btn-mini" (click)="resetView()">Reset View</button>
      </div>
    </main>
  `,
  styles: [`
    .canvas-container {
      flex: 1;
      background: var(--bg-main);
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      &:active { cursor: grabbing; }
    }
    .canvas-viewport {
      transform-origin: center;
      transition: transform 0.05s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .canvas {
      width: 1200px;
      height: 800px;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      position: relative;
      background-image: 
        linear-gradient(45deg, #f9fafb 25%, transparent 25%), 
        linear-gradient(-45deg, #f9fafb 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #f9fafb 75%), 
        linear-gradient(-45deg, transparent 75%, #f9fafb 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .element {
      position: absolute;
      border: 1px solid transparent;
      transition: border-color 0.2s, width 0.1s, height 0.1s, top 0.1s, left 0.1s, font-size 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      user-select: none;
      box-sizing: border-box;
      overflow: hidden;
      
      &.selected {
        border: 2px solid var(--primary) !important;
        z-index: 10;
      }
      
      &:hover:not(.selected) {
        border: 1px dashed var(--primary);
      }
    }
    .element-content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      text-align: center;
      &.no-pointer { pointer-events: none; }
      input { width: 100%; border: 1px solid #ccc; padding: 4px; }
    }
    .image-placeholder { font-size: 2rem; opacity: 0.3; }
    .resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: white;
      border: 2px solid var(--primary);
      z-index: 20;
    }
    .bottom-right { bottom: -6px; right: -6px; cursor: nwse-resize; }
    .canvas-actions {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: white;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: var(--shadow);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn-mini {
      padding: 2px 8px;
      font-size: 10px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      &:hover { background: #f3f4f6; }
    }
  `]
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
    console.log('Drop event:', event);
    const type = event.item.data as ElementType;
    const canvasEl = document.querySelector('.canvas') as HTMLElement;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const x = (event.dropPoint.x - rect.left) / this.zoom;
      const y = (event.dropPoint.y - rect.top) / this.zoom;
      console.log('Adding element:', type, 'at', x, y);
      this.editor.addElement(type, x, y);
    } else {
      console.warn('Canvas element not found for drop!');
    }
  }

  onDragEnded(event: CdkDragEnd, id: string) {
    const { x, y } = event.distance;
    const el = this.editor.project().elements[id];
    if (el) {
      // Adjust movement for zoom
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
      const el = this.editor.project().elements[this.resizeId];
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
