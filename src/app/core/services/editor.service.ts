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
            { id: crypto.randomUUID(), name: 'Index', elements: {}, rootElements: [], height: 2000 }
        ],
        activePageId: ''
    });

    gridSettings = signal({
        enabled: true,
        sizeX: 12,
        sizeY: 12,
        snapEnabled: false
    });

    updateGridSettings(settings: Partial<{ enabled: boolean, sizeX: number, sizeY: number, snapEnabled: boolean }>) {
        this.gridSettings.update(s => ({ ...s, ...settings }));
    }

    theme = signal<'light' | 'dark'>('light');
    clipboard = signal<WireframeElement | null>(null);

    toggleTheme() {
        this.theme.update(t => t === 'light' ? 'dark' : 'light');
        document.body.classList.toggle('dark', this.theme() === 'dark');
    }

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

    allElements = computed(() => {
        return Object.values(this.activePage().elements);
    });

    selectedElement = computed<WireframeElement | null>(() => {
        const id = this.selectedElementId();
        const page = this.activePage();
        if (!id || !page) return null;
        return page.elements[id] || null;
    });

    getElementAbsolutePosition(id: string, elements?: Record<string, WireframeElement>): { left: number, top: number } {
        const page = this.activePage();
        const el = (elements || page.elements)[id];
        if (!el) return { left: 0, top: 0 };

        if (!el.parentId) return { left: el.styles.left, top: el.styles.top };

        const parentPos = this.getElementAbsolutePosition(el.parentId, elements || page.elements);
        return {
            left: parentPos.left + el.styles.left,
            top: parentPos.top + el.styles.top
        };
    }

    reparentElement(id: string, newParentId?: string, targetAbs?: { left: number, top: number }) {
        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const page = { ...p.pages[activeIdx] };
            const elements = { ...page.elements };
            const el = elements[id];
            if (!el) return p;

            // Use target absolute position or current absolute position
            const absPos = targetAbs || this.getElementAbsolutePosition(id, elements);

            // Remove from old parent
            if (el.parentId && elements[el.parentId]) {
                elements[el.parentId] = {
                    ...elements[el.parentId],
                    children: (elements[el.parentId].children || []).filter(cid => cid !== id)
                };
            } else {
                page.rootElements = page.rootElements.filter(rid => rid !== id);
            }

            // Calculate new relative position
            let newRelativeX = absPos.left;
            let newRelativeY = absPos.top;

            if (newParentId && elements[newParentId]) {
                const newParentAbs = this.getElementAbsolutePosition(newParentId, elements);
                newRelativeX -= newParentAbs.left;
                newRelativeY -= newParentAbs.top;

                // Add to new parent (ensure no duplicates)
                const children = elements[newParentId].children || [];
                if (!children.includes(id)) {
                    elements[newParentId] = {
                        ...elements[newParentId],
                        children: [...children, id]
                    };
                }
            } else {
                // Add to root (ensure no duplicates)
                if (!page.rootElements.includes(id)) {
                    page.rootElements = [...page.rootElements, id];
                }
            }

            // Update element
            elements[id] = {
                ...el,
                parentId: (newParentId === el.id) ? el.parentId : newParentId, // Prevent self-nesting
                styles: {
                    ...el.styles,
                    left: newRelativeX,
                    top: newRelativeY
                }
            };

            const pages = [...p.pages];
            pages[activeIdx] = { ...page, elements };
            return { ...p, pages };
        });
    }

    // Page Management
    addPage(name: string = 'New Page') {
        const newPage: WireframePage = {
            id: crypto.randomUUID(),
            name,
            elements: {},
            rootElements: [],
            height: 2000
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

        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const pages = [...p.pages];
            const page = { ...pages[activeIdx] };

            // Calculate max z-index
            let maxZ = 0;
            Object.values(page.elements).forEach(el => {
                if (el.styles.zIndex && el.styles.zIndex > maxZ) maxZ = el.styles.zIndex;
            });

            const newElement: WireframeElement = {
                id,
                type,
                name: `${type}-${id.slice(0, 4)}`,
                styles: {
                    width: type === 'section' ? 1440 : (type === 'column' || type === 'article' ? 720 : 150),
                    height: type === 'section' ? 200 : (type === 'text' ? 40 : 100),
                    top: y,
                    left: x,
                    backgroundColor: this.getDefaultColor(type),
                    color: '#333333',
                    borderRadius: 4,
                    padding: 16,
                    zIndex: maxZ + 1,
                    display: (type === 'flex' || type === 'grid' || type === 'section' || type === 'column') ? 'flex' : 'block'
                },
                content: type === 'text' || type === 'button' ? 'New ' + type : undefined,
                parentId,
                children: []
            };

            const elements = { ...page.elements, [id]: newElement };
            const rootElements = parentId ? [...page.rootElements] : [...page.rootElements, id];

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
        return id;
    }

    addSectionWithStructure(columns: number, y: number) {
        const sectionId = this.addElement('section', 0, y);
        const colWidth = 1440 / columns;

        for (let i = 0; i < columns; i++) {
            this.addElement('column', i * colWidth, 0, sectionId);
        }
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

    updatePageHeight(id: string, height: number) {
        this.project.update(p => ({
            ...p,
            pages: p.pages.map(pg => pg.id === id ? { ...pg, height } : pg)
        }));
    }

    clearProject() {
        this.project.update(p => ({
            ...p,
            pages: [
                { id: crypto.randomUUID(), name: 'Index', elements: {}, rootElements: [], height: 2000 }
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

    copyElement(id: string) {
        const el = this.activePage().elements[id];
        if (el) {
            this.clipboard.set(JSON.parse(JSON.stringify(el)));
        }
    }

    pasteElement(parentId?: string) {
        const source = this.clipboard();
        if (!source) return;

        const id = crypto.randomUUID();
        const clone: WireframeElement = {
            ...JSON.parse(JSON.stringify(source)),
            id,
            parentId,
            styles: {
                ...source.styles,
                top: source.styles.top + 20,
                left: source.styles.left + 20
            }
        };

        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const pages = [...p.pages];
            const page = { ...pages[activeIdx] };
            const elements = { ...page.elements, [id]: clone };
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

    duplicateElement(id: string) {
        this.copyElement(id);
        this.pasteElement(this.activePage().elements[id]?.parentId);
    }

    updateContainerSize(containerId: string) {
        this.project.update(p => {
            const activeIdx = p.pages.findIndex(pg => pg.id === p.activePageId);
            if (activeIdx === -1) return p;

            const page = p.pages[activeIdx];
            const container = page.elements[containerId];
            if (!container || !container.children || container.children.length === 0) return p;

            // Calculate bounding box of children
            let maxY = 0;
            container.children.forEach(childId => {
                const child = page.elements[childId];
                if (child) {
                    const bottom = child.styles.top + child.styles.height;
                    if (bottom > maxY) maxY = bottom;
                }
            });

            const newHeight = maxY + (container.styles.padding || 16);
            if (newHeight <= container.styles.height) return p;

            const pages = [...p.pages];
            const updatedPage = { ...page };
            updatedPage.elements = {
                ...page.elements,
                [containerId]: {
                    ...container,
                    styles: { ...container.styles, height: newHeight }
                }
            };
            pages[activeIdx] = updatedPage;
            return { ...p, pages };
        });
    }

    private getDefaultColor(type: ElementType): string {
        switch (type) {
            case 'button': return '#3b82f6';
            case 'rect': return '#e5e7eb';
            case 'column':
            case 'section':
            case 'article':
            case 'grid':
            case 'flex': return '#f9fafb';
            case 'input': return '#ffffff';
            default: return 'transparent';
        }
    }
}
