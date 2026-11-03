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
export type AutoLayoutAlignMain = 'min' | 'center' | 'max' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly' | 'start' | 'end' | 'space-between';
export type AutoLayoutAlignCross = 'min' | 'center' | 'max' | 'baseline' | 'start' | 'end';
export type SizingBehavior = 'fixed' | 'hug' | 'fill';
export type TextAutoResizeMode = 'widthAndHeight' | 'height' | 'none' | 'truncate';

export interface FigCraftEffect {
  type: 'dropShadow' | 'innerShadow' | 'layerBlur' | 'backgroundBlur';
  color?: string;
  offset?: [number, number];
  radius?: number;
  spread?: number;
}

export interface FigCraftNodeProps {
  fills?: Array<{ color?: string; type: string; opacity?: number; stops?: string[]; from?: [number, number]; to?: [number, number] }> | string[];
  strokes?: Array<{ color: string; type: string }> | string[];
  strokeWeight?: number;
  cornerRadius?: number | [number, number, number, number];
  cornerSmoothing?: number; // 0 - 1 (Squircle / Apple curvature)
  effects?: FigCraftEffect[];
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justified';
  textAutoResize?: TextAutoResizeMode;
  opacity?: number;
  layout?: AutoLayoutDirection;
  gap?: number;
  crossGap?: number;
  padding?: number | [number, number, number, number];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  mainAlign?: 'min' | 'center' | 'max' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';
  crossAlign?: 'min' | 'center' | 'max' | 'baseline';
  sizingH?: SizingBehavior;
  sizingV?: SizingBehavior;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
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
  crossGap?: number;
  mainAlign?: AutoLayoutAlignMain;
  crossAlign?: AutoLayoutAlignCross;
  sizingH?: SizingBehavior;
  sizingV?: SizingBehavior;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  cornerSmoothing?: number;
  effects?: FigCraftEffect[];
  opacity?: number;
}

export interface ResponsiveSystemResult {
  desktop: { id: number; width: number; height: number; x: number; y: number };
  tablet: { id: number; width: number; height: number; x: number; y: number };
  mobile: { id: number; width: number; height: number; x: number; y: number };
  theme: {
    bg: string;
    surface: string;
    card: string;
    border: string;
    primary: string;
    primaryGlow: string;
    accent: string;
    accentEmerald: string;
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
  overflowCount: number;
  escapedNewlineCount: number;
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
      overflowIntegrity: string;
    };
  };
}
