import { Injectable, signal, computed } from '@angular/core';
import { WireframeElement, ElementType, WireframeProject } from '../models/element.model';

@Injectable({
    providedIn: 'root'
})
export class EditorService {
    // Simple project state
    project = signal<WireframeProject>({
        id: '1',
        name: 'Untitled Project',
        elements: {},
        rootElements: []
    });

    selectedElementId = signal<string | null>(null);

    // Computed views
    selectedElement = computed<WireframeElement | null>(() => {
        const id = this.selectedElementId();
        if (!id) return null;
        return this.project().elements[id] || null;
    });

    allElements = computed<WireframeElement[]>(() => Object.values(this.project().elements));

    addElement(type: ElementType, x: number, y: number, parentId?: string) {
        const id = crypto.randomUUID();
        const newElement: WireframeElement = {
            id,
            type,
            name: `${type}-${id.slice(0, 4)}`,
            styles: {
                width: 150,
                height: type === 'text' ? 40 : 100,
                top: y,
                left: x,
                backgroundColor: this.getDefaultColor(type),
                color: '#000000',
                borderRadius: 4,
                padding: 8
            },
            content: type === 'text' || type === 'button' ? 'New ' + type : undefined,
            parentId
        };

        this.project.update(p => {
            const elements = { ...p.elements, [id]: newElement };
            const rootElements = parentId ? p.rootElements : [...p.rootElements, id];

            if (parentId && elements[parentId]) {
                elements[parentId] = {
                    ...elements[parentId],
                    children: [...(elements[parentId].children || []), id]
                };
            }

            return { ...p, elements, rootElements };
        });

        this.selectedElementId.set(id);
    }

    updateElement(id: string, updates: Partial<WireframeElement>) {
        this.project.update(p => {
            if (!p.elements[id]) return p;
            return {
                ...p,
                elements: {
                    ...p.elements,
                    [id]: { ...p.elements[id], ...updates }
                }
            };
        });
    }

    updateStyles(id: string, styles: Partial<WireframeElement['styles']>) {
        this.project.update(p => {
            const el = p.elements[id];
            if (!el) return p;
            return {
                ...p,
                elements: {
                    ...p.elements,
                    [id]: {
                        ...el,
                        styles: { ...el.styles, ...styles }
                    }
                }
            };
        });
    }

    deleteElement(id: string) {
        this.project.update(p => {
            const elements = { ...p.elements };
            const idsToDelete = this.getIdsToDelete(id, elements);

            const deleted = elements[id];

            // Remove from elements map
            idsToDelete.forEach(idToDelete => delete elements[idToDelete]);

            // Remove from rootElements
            let rootElements = p.rootElements.filter(rid => rid !== id);

            // Cleanup parent reference
            if (deleted?.parentId && elements[deleted.parentId]) {
                elements[deleted.parentId] = {
                    ...elements[deleted.parentId],
                    children: (elements[deleted.parentId].children || []).filter(cid => cid !== id)
                };
            }

            return { ...p, elements, rootElements };
        });

        if (this.selectedElementId() === id) {
            this.selectedElementId.set(null);
        }
    }

    private getIdsToDelete(id: string, elements: Record<string, WireframeElement>): string[] {
        let ids = [id];
        const el = elements[id];
        if (el?.children) {
            el.children.forEach(childId => {
                ids = [...ids, ...this.getIdsToDelete(childId, elements)];
            });
        }
        return ids;
    }

    clearProject() {
        this.project.update(p => ({
            ...p,
            elements: {},
            rootElements: []
        }));
        this.selectedElementId.set(null);
    }

    selectElement(id: string | null) {
        this.selectedElementId.set(id);
    }

    private getDefaultColor(type: ElementType): string {
        switch (type) {
            case 'button': return '#3b82f6';
            case 'rect': return '#e5e7eb';
            case 'container': return '#f9fafb';
            case 'input': return '#ffffff';
            default: return 'transparent';
        }
    }
}
