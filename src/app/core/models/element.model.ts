export type ElementType = 'text' | 'button' | 'input' | 'rect' | 'image' | 'container' | 'section' | 'column' | 'article' | 'grid' | 'flex';

export interface ElementStyles {
  width: number;
  height: number;
  top: number;
  left: number;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  padding?: number;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  fontWeight?: string | number;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  flexWrap?: string;
  margin?: number;
  zIndex?: number;
}

export interface WireframeElement {
  id: string;
  type: ElementType;
  name: string;
  styles: ElementStyles;
  content?: string;
  placeholder?: string;
  imageUrl?: string;
  parentId?: string;
  children?: string[]; // IDs of child elements
}

export interface WireframePage {
  id: string;
  name: string;
  elements: Record<string, WireframeElement>;
  rootElements: string[];
  height: number;
}

export interface WireframeProject {
  id: string;
  name: string;
  pages: WireframePage[];
  activePageId: string;
}
