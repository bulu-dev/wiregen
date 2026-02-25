import { Injectable, signal, computed } from '@angular/core';
import { WireframeElement, ElementType, WireframeProject, WireframePage } from '../models/element.model';

@Injectable({
    providedIn: 'root'
})
@Injectable({
    providedIn: 'root'
})
export class EditorService {
    // Advanced project state with multi-page support
    project = signal<WireframeProject>({
        id: '1',
        name: 'Untitled Project',
        pages: [
            { id: crypto.randomUUID(), name: 'Index', elements: {}, rootElements: [] }
        ],
        activePageId: '' // Will be set in constructor or first access
    });

    constructor() {
        // Initialize activePageId to the first page if not set
        const p = this.project();
        if (p.pages.length > 0) {
            this.project.update(prev => ({ ...prev, activePageId: prev.pages[0].id }));
        }
    }

    selectedElementId = signal<string | null>(null);

    // Computed views
    activePage = computed(() => {
        const p = this.project();
        return p.pages.find(pg => pg.id === p.activePageId) || p.pages[0];
    });

    selectedElement = computed<WireframeElement | null>(() => {
        const id = this.selectedElementId();
        const page = this.activePage();
        if (!id || !page) return null;
        return page.elements[id] || null;
    });

    allElements = computed<WireframeElement[]>(() => {
        const page = this.activePage();
        return page ? Object.values(page.elements) : [];
    });

    // Page Management
    addPage(name: string = 'New Page') {
        const newPage: WireframePage = {
            id: crypto.randomUUID(),
            name,
            elements: {},
            rootElements: []
        };
        this.project.update(p => ({
            ...p,
            pages: [...p.pages, newPage],
            activePageId: newPage.id
        }));
        this.selectedElementId.set(null);
    }

    setActivePage(id: string) {
        this.project.update(p => ({ ...p, activePageId: id }));
        this.selectedElementId.set(null);
    }

    renamePage(id: string, name: string) {
        this.project.update(p => ({
            ...p,
            pages: p.pages.map(pg => pg.id === id ? { ...pg, name } : pg)
        }));
    }

    deletePage(id: string) {
        this.project.update(p => {
            if (p.pages.length <= 1) return p; // Keep at least one page
            const pages = p.pages.filter(pg => pg.id !== id);
            const activePageId = p.activePageId === id ? pages[0].id : p.activePageId;
            return { ...p, pages, activePageId };
        });
    }

    // Element Management (Scoped to active page)
    addElement(type: ElementType, x: number, y: number, parentId?: string) {
        const id = crypto.randomUUID();
        const newElement: WireframeElement = {
            id,
            type,
            name: `${type}-${id.slice(0, 4)}`,
            styles: {
                width: type === 'section' || type === 'article' ? 1200 : 150,
                height: type === 'text' ? 40 : 100,
                top: y,
                left: x,
                backgroundColor: this.getDefaultColor(type),
                color: '#000000',
                borderRadius: 4,
                padding: 16,
                display: (type === 'flex' || type === 'grid' || type === 'section') ? 'flex' : 'block'
            },
            content: type === 'text' || type === 'button' ? 'New ' + type : undefined,
            parentId
        };

        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const pages = [...p.pages];
            const page = { ...pages[activeIdx] };
            const elements = { ...page.elements, [id]: newElement };
            const rootElements = parentId ? page.rootElements : [...page.rootElements, id];

            if (parentId && elements[parentId]) {
                elements[parentId] = {
                    ...elements[parentId],
                    children: [...(elements[parentId].children || []), id]
                };
            }

            page.elements = elements;
            page.rootElements = rootElements;
            pages[activeIdx] = page;

            return { ...p, pages };
        });

        this.selectedElementId.set(id);
    }

    updateElement(id: string, updates: Partial<WireframeElement>) {
        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1 || !p.pages[activeIdx].elements[id]) return p;

            const pages = [...p.pages];
            const page = { ...pages[activeIdx] };
            page.elements = {
                ...page.elements,
                [id]: { ...page.elements[id], ...updates }
            };
            pages[activeIdx] = page;
            return { ...p, pages };
        });
    }

    updateStyles(id: string, styles: Partial<WireframeElement['styles']>) {
        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const page = p.pages[activeIdx];
            const el = page.elements[id];
            if (!el) return p;

            const pages = [...p.pages];
            const updatedPage = { ...page };
            updatedPage.elements = {
                ...page.elements,
                [id]: {
                    ...el,
                    styles: { ...el.styles, ...styles }
                }
            };
            pages[activeIdx] = updatedPage;
            return { ...p, pages };
        });
    }

    deleteElement(id: string) {
        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const page = p.pages[activeIdx];
            const elements = { ...page.elements };
            const idsToDelete = this.getIdsToDelete(id, elements);
            const deleted = elements[id];

            idsToDelete.forEach(idToDelete => delete elements[idToDelete]);
            const rootElements = page.rootElements.filter(rid => rid !== id);

            if (deleted?.parentId && elements[deleted.parentId]) {
                elements[deleted.parentId] = {
                    ...elements[deleted.parentId],
                    children: (elements[deleted.parentId].children || []).filter(cid => cid !== id)
                };
            }

            const pages = [...p.pages];
            pages[activeIdx] = { ...page, elements, rootElements };
            return { ...p, pages };
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
            pages: [
                { id: crypto.randomUUID(), name: 'Index', elements: {}, rootElements: [] }
            ],
            activePageId: '' // Will be reset
        }));
        // Re-init activePageId
        const newId = this.project().pages[0].id;
        this.project.update(p => ({ ...p, activePageId: newId }));
        this.selectedElementId.set(null);
    }

    selectElement(id: string | null) {
        this.selectedElementId.set(id);
    }

    private getDefaultColor(type: ElementType): string {
        switch (type) {
            case 'button': return '#3b82f6';
            case 'rect': return '#e5e7eb';
            case 'container':
            case 'section':
            case 'article':
            case 'grid':
            case 'flex': return '#f9fafb';
            case 'input': return '#ffffff';
            default: return 'transparent';
        }
    }
}
