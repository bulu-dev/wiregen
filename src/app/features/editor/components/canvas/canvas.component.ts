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
          cdkDropList
          (cdkDropListDropped)="onDrop($event)">
      
      <div class="canvas" [style.transform]="'scale(' + zoom + ')'">
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
               [style.border-width.px]="el.styles.borderWidth"
               [style.border-color]="el.styles.borderColor"
               [style.border-style]="el.styles.borderWidth ? 'solid' : 'transparent'"
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

      <div class="canvas-actions">
        <span>Zoom: {{ zoom * 100 }}%</span>
      </div>
    </main>
  `,
  styles: [`
    .canvas-container {
      flex: 1;
      background: var(--bg-main);
      overflow: auto;
      position: relative;
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
      align-items: center;
      justify-content: center;
      user-select: none;
      box-sizing: border-box;
      
      &.selected {
        border: 2px solid var(--primary);
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
    }
  `]
})
export class CanvasComponent {
  editor = inject(EditorService);
  zoom = 1;

  onDrop(event: any) {
    // This is from Sidebar dragging
    const type = event.item.data as ElementType;
    const canvasRect = document.querySelector('.canvas')?.getBoundingClientRect();
    if (canvasRect) {
      // Calculate position relative to canvas
      const x = event.dropPoint.x - canvasRect.left;
      const y = event.dropPoint.y - canvasRect.top;
      this.editor.addElement(type, x, y);
    }
  }

  onDragEnded(event: CdkDragEnd, id: string) {
    const { x, y } = event.distance;
    const el = this.editor.project().elements[id];
    if (el) {
      this.editor.updateStyles(id, {
        left: el.styles.left + x,
        top: el.styles.top + y
      });
    }
    // Reset transform because we updated top/left
    event.source.reset();
  }

  onCanvasClick(event: MouseEvent) {
    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('canvas')) {
      this.editor.selectElement(null);
    }
  }

  // Basic Resizing logic
  private isResizing = false;
  private resizeId = '';

  startResize(event: MouseEvent, id: string) {
    event.stopPropagation();
    event.preventDefault();
    this.isResizing = true;
    this.resizeId = id;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizing && this.resizeId) {
      const el = this.editor.project().elements[this.resizeId];
      if (el) {
        const canvasRect = document.querySelector('.canvas')?.getBoundingClientRect();
        if (canvasRect) {
          const newWidth = event.clientX - canvasRect.left - el.styles.left;
          const newHeight = event.clientY - canvasRect.top - el.styles.top;
          this.editor.updateStyles(this.resizeId, {
            width: Math.max(20, newWidth),
            height: Math.max(20, newHeight)
          });
        }
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isResizing = false;
    this.resizeId = '';
  }
}
