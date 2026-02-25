import { Injectable, inject } from '@angular/core';
import { EditorService } from './editor.service';
import { WireframeElement, WireframeProject, WireframePage } from '../models/element.model';
import JSZip from 'jszip';

@Injectable({
    providedIn: 'root'
})
export class ExportService {
    private editor = inject(EditorService);

    async exportProject() {
        const project = this.editor.project();
        const zip = new JSZip();

        // Multi-page export
        project.pages.forEach(page => {
            const fileName = page.name.toLowerCase() === 'index' ? 'index.html' : `${page.name.toLowerCase().replace(/\s+/g, '_')}.html`;
            const html = this.generateHTMLForPage(project, page);
            zip.file(fileName, html);
        });

        const css = this.generateCSS(project);
        zip.file('style.css', css);
        zip.file('robots.txt', this.generateRobotsTxt());
        zip.file('sitemap.xml', this.generateSitemap(project));
        zip.file('README.md', this.generateReadme(project));

        const content = await zip.generateAsync({ type: 'blob' });
        this.downloadFile(`${project.name.replace(/\s+/g, '_')}_export.zip`, content);
    }

    previewProject() {
        const project = this.editor.project();
        const activePage = this.editor.activePage();
        const html = this.generateHTMLForPage(project, activePage);
        const css = this.generateCSS(project);

        const previewHtml = html.replace(
            '</head>',
            `<style>${css}</style></head>`
        );

        const blob = new Blob([previewHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    private generateHTMLForPage(project: WireframeProject, page: WireframePage): string {
        const elementsHtml = page.rootElements
            .map(id => this.renderElementToHtml(page.elements[id], page.elements, project))
            .join('\n');

        const navHtml = project.pages.length > 1 ? `
    <nav class="site-nav">
        <ul>
            ${project.pages.map(p => `<li><a href="${p.name.toLowerCase() === 'index' ? 'index.html' : p.name.toLowerCase().replace(/\s+/g, '_') + '.html'}">${p.name}</a></li>`).join('')}
        </ul>
    </nav>` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name} - ${project.name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    ${navHtml}
    <main class="page-content">
        ${elementsHtml}
    </main>
    <footer class="footer">
        <p>WireGen Design System</p>
    </footer>
</body>
</html>`;
    }

    private renderElementToHtml(el: WireframeElement, all: Record<string, WireframeElement>, project: WireframeProject): string {
        const childrenHtml = (el.children || [])
            .map(id => this.renderElementToHtml(all[id], all, project))
            .join('\n');

        const tagName = this.getTagName(el.type);
        const attributes = this.getAttributes(el);
        const content = el.content || '';

        if (el.type === 'image') {
            return `<figure class="element element-${el.id}">
        <img src="${el.imageUrl || 'https://via.placeholder.com/800x400'}" alt="${el.name}">
        ${childrenHtml ? `<figcaption>${childrenHtml}</figcaption>` : ''}
      </figure>`;
        }

        return `<${tagName} class="element element-${el.id}" ${attributes}>
    ${content}
    ${childrenHtml}
</${tagName}>`;
    }

    private getTagName(type: string): string {
        switch (type) {
            case 'button': return 'button';
            case 'input': return 'input';
            case 'text': return 'p';
            case 'section': return 'section';
            case 'article': return 'article';
            case 'grid':
            case 'flex':
            case 'container': return 'div';
            default: return 'div';
        }
    }

    private getAttributes(el: WireframeElement): string {
        if (el.type === 'input') {
            return `type="text" placeholder="${el.placeholder || ''}"`;
        }
        return '';
    }

    private generateCSS(project: WireframeProject): string {
        let css = `
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #fff; overflow-x: hidden; }
.site-nav { background: #f8fafc; padding: 1rem; border-bottom: 1px solid #e2e8f0; }
.site-nav ul { list-style: none; display: flex; gap: 2rem; margin: 0; padding: 0; justify-content: center; }
.site-nav a { text-decoration: none; color: #3b82f6; font-weight: 600; }
.page-content { width: 1440px; margin: 0 auto; min-height: 100vh; position: relative; }
.footer { padding: 4rem 2rem; background: #1e293b; color: white; text-align: center; }
.element { position: absolute; display: flex; overflow: hidden; }
img { max-width: 100%; display: block; }
`;

        project.pages.forEach(page => {
            Object.values(page.elements).forEach(el => {
                const s = el.styles;
                const isContainer = ['section', 'article', 'grid', 'flex', 'container'].includes(el.type);

                css += `
.element-${el.id} {
  width: ${s.width}px;
  height: ${s.height}px;
  top: ${s.top}px;
  left: ${s.left}px;
  background-color: ${s.backgroundColor || 'transparent'};
  color: ${s.color || 'inherit'};
  border-radius: ${s.borderRadius || 0}px;
  padding: ${s.padding || 0}px;
  font-size: ${s.fontSize || 16}px;
  font-weight: ${s.fontWeight || 400};
  justify-content: ${s.justifyContent || 'center'};
  align-items: ${s.alignItems || 'center'};
  ${s.borderWidth ? `border: ${s.borderWidth}px solid ${s.borderColor || '#000'};` : ''}
  ${el.type === 'flex' ? 'display: flex;' : ''}
  ${el.type === 'grid' ? `display: grid; grid-template-columns: ${s.gridTemplateColumns || '1fr 1fr'};` : ''}
  ${isContainer ? `gap: ${s.gap || 0}px;` : ''}
}
`;
            });
        });

        return css;
    }

    private generateRobotsTxt(): string {
        return `User-agent: *\nAllow: /`;
    }

    private generateSitemap(project: WireframeProject): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${project.pages.map(p => `
  <url>
    <loc>/${p.name.toLowerCase().replace(/\s+/g, '_')}.html</loc>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
    }

    private generateReadme(project: WireframeProject): string {
        return `# ${project.name}

This project was generated using **WireGen**, a modern wireframe editor.

## Contents
- \`index.html\`: Semantic HTML layout
- \`style.css\`: Layout and component styling
- \`robots.txt\`: SEO configuration
- \`sitemap.xml\`: Site structure for search engines

## How to use
Simply open \`index.html\` in any modern web browser to view your wireframe.
`;
    }

    private downloadFile(filename: string, blob: Blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }
}
