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

export type AutoLayoutDirection = 'none' | 'vertical' | 'horizontal';
export type AutoLayoutAlignMain = 'min' | 'center' | 'max' | 'spaceBetween' | 'start' | 'end' | 'space-between';
export type AutoLayoutAlignCross = 'min' | 'center' | 'max' | 'baseline' | 'start' | 'end';
export type SizingBehavior = 'fixed' | 'hug' | 'fill';

export interface FigCraftNodeProps {
  fills?: Array<{ color: string; type: string; opacity?: number }> | string[];
  strokes?: Array<{ color: string; type: string }> | string[];
  strokeWeight?: number;
  cornerRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  opacity?: number;
  layout?: AutoLayoutDirection;
  gap?: number;
  padding?: number | [number, number, number, number];
  mainAlign?: 'min' | 'center' | 'max' | 'spaceBetween';
  crossAlign?: 'min' | 'center' | 'max' | 'baseline';
  sizingH?: SizingBehavior;
  sizingV?: SizingBehavior;
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

export interface AutoLayoutFrameParams {
  name: string;
  parent?: number;
  direction?: 'vertical' | 'horizontal';
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  padding?: number | [number, number, number, number];
  gap?: number;
  mainAlign?: AutoLayoutAlignMain;
  crossAlign?: AutoLayoutAlignCross;
  sizingH?: SizingBehavior;
  sizingV?: SizingBehavior;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  opacity?: number;
}

export interface ResponsiveSystemResult {
  desktop: { id: number; width: number; height: number; x: number; y: number };
  tablet: { id: number; width: number; height: number; x: number; y: number };
  mobile: { id: number; width: number; height: number; x: number; y: number };
  theme: {
    bg: string;
    surface: string;
    border: string;
    primary: string;
    accent: string;
    text: string;
    textMuted: string;
  };
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
  nodes?: Record<string, unknown>;
}

export interface LayoutAuditViolation {
  rule: 'flat-hierarchy' | 'unescaped-newlines' | 'missing-responsive' | 'overflow' | 'unconstrained-text';
  severity: 'error' | 'warning' | 'info';
  nodeId?: number;
  nodeName?: string;
  message: string;
  recommendation: string;
}

export interface LayoutAuditReport {
  score: number; // 0 - 100
  passed: boolean;
  totalNodes: number;
  autoLayoutFrameCount: number;
  flatRootChildrenCount: number;
  responsiveArtboards: {
    desktopFound: boolean;
    tabletFound: boolean;
    mobileFound: boolean;
  };
  violations: LayoutAuditViolation[];
  harnessEvidence: {
    checkpoint: string;
    status: 'pass' | 'fail';
    summary: string;
    metrics: {
      autoLayoutAdoption: string;
      responsiveCoverage: string;
      cleanTextAdoption: string;
    };
  };
}
