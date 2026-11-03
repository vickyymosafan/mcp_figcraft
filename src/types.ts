export type NodeType =
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'section'
  | 'vector'
  | 'component'
  | 'line'
  | 'arrow'
  | 'star'
  | 'polygon';

export interface FigCraftNodeProps {
  fills?: string[] | Array<{ color: string; type: string }>;
  strokes?: string[];
  strokeWeight?: number;
  cornerRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  opacity?: number;
  layout?: 'none' | 'vertical' | 'horizontal';
  gap?: number;
  padding?: number | [number, number, number, number];
  mainAlign?: 'start' | 'center' | 'end' | 'spaceBetween';
  crossAlign?: 'start' | 'center' | 'end';
  sizingH?: 'fixed' | 'hug' | 'fill';
  sizingV?: 'fixed' | 'hug' | 'fill';
  [key: string]: unknown;
}

export interface CreateNodeParams {
  type: NodeType;
  name?: string;
  parent?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  characters?: string;
  props?: FigCraftNodeProps;
  select?: boolean;
}

export interface FigCraftResponse<T = unknown> {
  id: number | string;
  ok?: boolean;
  result?: T;
  error?: string;
}

export interface DocumentSummary {
  id?: number;
  name?: string;
  path?: string | null;
  pages?: unknown[];
  currentPage?: number;
  dirty?: boolean;
  colorProfile?: string;
}

