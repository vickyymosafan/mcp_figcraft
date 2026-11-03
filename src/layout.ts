import type {
  AutoLayoutAlignCross,
  AutoLayoutAlignMain,
  AutoLayoutFrameParams,
  CreateNodeParams,
  FigCraftNodeProps
} from './types.js';

export const DESIGN_TOKENS = {
  colors: {
    dark: {
      bg: '#0B0F17',
      surface: '#111827',
      card: '#1F2937',
      border: '#374151',
      primary: '#3B82F6',
      accent: '#10B981',
      text: '#F9FAFB',
      textMuted: '#9CA3AF'
    },
    light: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      card: '#F1F5F9',
      border: '#E2E8F0',
      primary: '#2563EB',
      accent: '#059669',
      text: '#0F172A',
      textMuted: '#64748B'
    }
  },
  typography: {
    display: { fontSize: 44, fontWeight: 800, lineHeight: 1.15 },
    h1: { fontSize: 32, fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: 24, fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: 500, lineHeight: 1.4 }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 9999
  }
};

/**
 * Normalizes user-supplied alignment enums to FigCraft engine's expected strings:
 * - 'start' -> 'min'
 * - 'end' -> 'max'
 * - 'space-between' / 'spaceBetween' -> 'spaceBetween'
 */
export function normalizeMainAlign(align?: AutoLayoutAlignMain): 'min' | 'center' | 'max' | 'spaceBetween' {
  if (!align) return 'min';
  const lower = align.toLowerCase();
  if (lower === 'start' || lower === 'min') return 'min';
  if (lower === 'end' || lower === 'max') return 'max';
  if (lower === 'center') return 'center';
  if (lower === 'spacebetween' || lower === 'space-between') return 'spaceBetween';
  return 'min';
}

/**
 * Normalizes cross alignment:
 * - 'start' -> 'min'
 * - 'end' -> 'max'
 */
export function normalizeCrossAlign(align?: AutoLayoutAlignCross): 'min' | 'center' | 'max' | 'baseline' {
  if (!align) return 'min';
  const lower = align.toLowerCase();
  if (lower === 'start' || lower === 'min') return 'min';
  if (lower === 'end' || lower === 'max') return 'max';
  if (lower === 'center') return 'center';
  if (lower === 'baseline') return 'baseline';
  return 'min';
}

/**
 * Sanitizes text to remove literal escaped characters (\n, \t) so text renders
 * with actual multi-line formatting on canvas rather than literal "\\n" string artifacts.
 */
export function sanitizeText(input?: string): string {
  if (!input) return '';
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t');
}

/**
 * Converts AutoLayoutFrameParams to a canonical FigCraft createNode params object.
 */
export function buildAutoLayoutNodeParams(params: AutoLayoutFrameParams): CreateNodeParams {
  const props: FigCraftNodeProps = {
    layout: params.direction || 'vertical',
    gap: params.gap ?? 16,
    padding: params.padding ?? 16,
    mainAlign: normalizeMainAlign(params.mainAlign),
    crossAlign: normalizeCrossAlign(params.crossAlign),
    sizingH: params.sizingH || 'fixed',
    sizingV: params.sizingV || 'hug'
  };

  if (params.bgColor) {
    props.fills = [{ type: 'solid', color: params.bgColor }];
  }

  if (params.borderColor) {
    props.strokes = [{ type: 'solid', color: params.borderColor }];
    props.strokeWeight = params.borderWidth ?? 1;
  }

  if (params.cornerRadius !== undefined) {
    props.cornerRadius = params.cornerRadius;
  }

  if (params.opacity !== undefined) {
    props.opacity = params.opacity;
  }

  return {
    type: 'frame',
    name: params.name,
    parent: params.parent,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    props
  };
}
