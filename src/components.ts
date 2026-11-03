import type { FigCraftClient } from './client.js';
import { DESIGN_TOKENS, sanitizeText } from './layout.js';
import type { ResponsiveSystemResult } from './types.js';

export interface ResponsiveArtboardsOptions {
  projectName?: string;
  theme?: 'dark' | 'light';
  desktopWidth?: number;
  desktopHeight?: number;
  tabletWidth?: number;
  tabletHeight?: number;
  mobileWidth?: number;
  mobileHeight?: number;
}

export interface NavbarOptions {
  parent: number;
  brandName: string;
  links?: string[];
  ctaText?: string;
  theme?: 'dark' | 'light';
  width?: number;
}

export interface HeroSectionOptions {
  parent: number;
  badge?: string;
  title: string;
  subtitle: string;
  primaryCta?: string;
  secondaryCta?: string;
  theme?: 'dark' | 'light';
  width?: number;
}

export interface CardOptions {
  parent: number;
  title: string;
  subtitle?: string;
  tag?: string;
  body?: string;
  price?: string;
  buttonLabel?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

export interface MetricItem {
  value: string;
  label: string;
  trend?: string;
}

/**
 * Creates 3 synchronized responsive artboards side-by-side on the canvas:
 * 1. Desktop Artboard (default 1440px wide) at x: 0
 * 2. Tablet Artboard (default 768px wide) at x: 1540
 * 3. Mobile Artboard (default 375px wide) at x: 2408
 */
export async function createResponsiveArtboards(
  client: FigCraftClient,
  options: ResponsiveArtboardsOptions = {}
): Promise<ResponsiveSystemResult> {
  const themeMode = options.theme || 'dark';
  const tokens = DESIGN_TOKENS.colors[themeMode];

  const desktopW = options.desktopWidth || 1440;
  const desktopH = options.desktopHeight || 1024;
  const tabletW = options.tabletWidth || 768;
  const tabletH = options.tabletHeight || 1024;
  const mobileW = options.mobileWidth || 375;
  const mobileH = options.mobileHeight || 812;

  const gapBetweenArtboards = 100;
  const tabletX = desktopW + gapBetweenArtboards;
  const mobileX = tabletX + tabletW + gapBetweenArtboards;

  // 1. Create Desktop Artboard
  const desktopNode = await client.createAutoLayoutFrame({
    name: `🖥️ Desktop — ${options.projectName || 'Storefront'} (1440px)`,
    direction: 'vertical',
    x: 0,
    y: 0,
    width: desktopW,
    height: desktopH,
    padding: [0, 0, 0, 0],
    gap: 0,
    mainAlign: 'min',
    crossAlign: 'min',
    bgColor: tokens.bg
  });

  // 2. Create Tablet Artboard
  const tabletNode = await client.createAutoLayoutFrame({
    name: `📱 Tablet — ${options.projectName || 'Storefront'} (768px)`,
    direction: 'vertical',
    x: tabletX,
    y: 0,
    width: tabletW,
    height: tabletH,
    padding: [0, 0, 0, 0],
    gap: 0,
    mainAlign: 'min',
    crossAlign: 'min',
    bgColor: tokens.bg
  });

  // 3. Create Mobile Artboard
  const mobileNode = await client.createAutoLayoutFrame({
    name: `📲 Mobile — ${options.projectName || 'Storefront'} (375px)`,
    direction: 'vertical',
    x: mobileX,
    y: 0,
    width: mobileW,
    height: mobileH,
    padding: [0, 0, 0, 0],
    gap: 0,
    mainAlign: 'min',
    crossAlign: 'min',
    bgColor: tokens.bg
  });

  return {
    desktop: { id: desktopNode.id, width: desktopW, height: desktopH, x: 0, y: 0 },
    tablet: { id: tabletNode.id, width: tabletW, height: tabletH, x: tabletX, y: 0 },
    mobile: { id: mobileNode.id, width: mobileW, height: mobileH, x: mobileX, y: 0 },
    theme: tokens
  };
}

/**
 * Creates an Auto-Layout Header/Navbar container with brand logo, nav links, and CTA button.
 */
export async function createNavbarComponent(
  client: FigCraftClient,
  opts: NavbarOptions
): Promise<{ containerId: number }> {
  const theme = opts.theme || 'dark';
  const tokens = DESIGN_TOKENS.colors[theme];

  const navContainer = await client.createAutoLayoutFrame({
    name: 'Navbar',
    parent: opts.parent,
    direction: 'horizontal',
    padding: [20, 48, 20, 48],
    gap: 32,
    mainAlign: 'spaceBetween',
    crossAlign: 'center',
    sizingH: opts.width ? 'fixed' : 'fill',
    sizingV: 'hug',
    width: opts.width,
    bgColor: tokens.surface,
    borderColor: tokens.border,
    borderWidth: 1
  });

  // Brand / Logo Stack
  await client.createNode({
    type: 'text',
    name: 'Brand Logo',
    parent: navContainer.id,
    text: sanitizeText(opts.brandName),
    props: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: -0.5,
      fills: [{ type: 'solid', color: tokens.text }]
    }
  });

  // Nav Links horizontal stack
  const links = opts.links || ['Products', 'Solutions', 'Features', 'Docs'];
  const linksContainer = await client.createAutoLayoutFrame({
    name: 'Nav Links',
    parent: navContainer.id,
    direction: 'horizontal',
    gap: 24,
    padding: 0,
    mainAlign: 'center',
    crossAlign: 'center',
    sizingH: 'hug',
    sizingV: 'hug'
  });

  for (const link of links) {
    await client.createNode({
      type: 'text',
      name: `Link - ${link}`,
      parent: linksContainer.id,
      text: sanitizeText(link),
      props: {
        fontSize: 14,
        fontWeight: 500,
        fills: [{ type: 'solid', color: tokens.textMuted }]
      }
    });
  }

  // CTA Button
  if (opts.ctaText) {
    const ctaBtn = await client.createAutoLayoutFrame({
      name: 'Nav CTA Button',
      parent: navContainer.id,
      direction: 'horizontal',
      padding: [10, 20, 10, 20],
      gap: 8,
      mainAlign: 'center',
      crossAlign: 'center',
      sizingH: 'hug',
      sizingV: 'hug',
      bgColor: tokens.primary,
      cornerRadius: DESIGN_TOKENS.radii.md
    });

    await client.createNode({
      type: 'text',
      name: 'CTA Label',
      parent: ctaBtn.id,
      text: sanitizeText(opts.ctaText),
      props: {
        fontSize: 14,
        fontWeight: 600,
        fills: [{ type: 'solid', color: '#FFFFFF' }]
      }
    });
  }

  return { containerId: navContainer.id };
}

/**
 * Creates an Auto-Layout Hero section with eyebrow badge, display title, subtitle, and CTA buttons.
 */
export async function createHeroComponent(
  client: FigCraftClient,
  opts: HeroSectionOptions
): Promise<{ containerId: number }> {
  const theme = opts.theme || 'dark';
  const tokens = DESIGN_TOKENS.colors[theme];

  const heroContainer = await client.createAutoLayoutFrame({
    name: 'Hero Section',
    parent: opts.parent,
    direction: 'vertical',
    padding: [64, 48, 64, 48],
    gap: 24,
    mainAlign: 'min',
    crossAlign: 'min',
    sizingH: opts.width ? 'fixed' : 'fill',
    sizingV: 'hug',
    width: opts.width
  });

  // Eyebrow Badge
  if (opts.badge) {
    const badgeFrame = await client.createAutoLayoutFrame({
      name: 'Eyebrow Badge',
      parent: heroContainer.id,
      direction: 'horizontal',
      padding: [6, 14, 6, 14],
      gap: 8,
      mainAlign: 'center',
      crossAlign: 'center',
      sizingH: 'hug',
      sizingV: 'hug',
      bgColor: theme === 'dark' ? '#1E293B' : '#E0E7FF',
      borderColor: theme === 'dark' ? '#3B82F6' : '#C7D2FE',
      borderWidth: 1,
      cornerRadius: DESIGN_TOKENS.radii.full
    });

    await client.createNode({
      type: 'text',
      name: 'Badge Text',
      parent: badgeFrame.id,
      text: sanitizeText(opts.badge),
      props: {
        fontSize: 12,
        fontWeight: 600,
        fills: [{ type: 'solid', color: tokens.primary }]
      }
    });
  }

  // Display Title (Sanitized multiline!)
  await client.createNode({
    type: 'text',
    name: 'Hero Headline',
    parent: heroContainer.id,
    text: sanitizeText(opts.title),
    props: {
      fontSize: DESIGN_TOKENS.typography.display.fontSize,
      fontWeight: DESIGN_TOKENS.typography.display.fontWeight,
      lineHeight: 1.15,
      letterSpacing: -1,
      fills: [{ type: 'solid', color: tokens.text }]
    }
  });

  // Subtitle / Description
  await client.createNode({
    type: 'text',
    name: 'Hero Subtitle',
    parent: heroContainer.id,
    text: sanitizeText(opts.subtitle),
    props: {
      fontSize: 18,
      fontWeight: 400,
      lineHeight: 1.5,
      fills: [{ type: 'solid', color: tokens.textMuted }]
    }
  });

  // CTA Button Row
  if (opts.primaryCta || opts.secondaryCta) {
    const buttonRow = await client.createAutoLayoutFrame({
      name: 'CTA Button Row',
      parent: heroContainer.id,
      direction: 'horizontal',
      gap: 16,
      padding: 0,
      mainAlign: 'min',
      crossAlign: 'center',
      sizingH: 'hug',
      sizingV: 'hug'
    });

    if (opts.primaryCta) {
      const pBtn = await client.createAutoLayoutFrame({
        name: 'Primary Button',
        parent: buttonRow.id,
        direction: 'horizontal',
        padding: [14, 28, 14, 28],
        gap: 8,
        mainAlign: 'center',
        crossAlign: 'center',
        sizingH: 'hug',
        sizingV: 'hug',
        bgColor: tokens.primary,
        cornerRadius: DESIGN_TOKENS.radii.md
      });

      await client.createNode({
        type: 'text',
        name: 'Label',
        parent: pBtn.id,
        text: sanitizeText(opts.primaryCta),
        props: {
          fontSize: 15,
          fontWeight: 600,
          fills: [{ type: 'solid', color: '#FFFFFF' }]
        }
      });
    }

    if (opts.secondaryCta) {
      const sBtn = await client.createAutoLayoutFrame({
        name: 'Secondary Button',
        parent: buttonRow.id,
        direction: 'horizontal',
        padding: [14, 28, 14, 28],
        gap: 8,
        mainAlign: 'center',
        crossAlign: 'center',
        sizingH: 'hug',
        sizingV: 'hug',
        bgColor: 'transparent',
        borderColor: tokens.border,
        borderWidth: 1,
        cornerRadius: DESIGN_TOKENS.radii.md
      });

      await client.createNode({
        type: 'text',
        name: 'Label',
        parent: sBtn.id,
        text: sanitizeText(opts.secondaryCta),
        props: {
          fontSize: 15,
          fontWeight: 600,
          fills: [{ type: 'solid', color: tokens.text }]
        }
      });
    }
  }

  return { containerId: heroContainer.id };
}

/**
 * Creates an Auto-Layout Card component with media slot, content stack, and action button.
 */
export async function createCardComponent(
  client: FigCraftClient,
  opts: CardOptions
): Promise<{ cardId: number }> {
  const theme = opts.theme || 'dark';
  const tokens = DESIGN_TOKENS.colors[theme];

  const card = await client.createAutoLayoutFrame({
    name: `Card - ${opts.title}`,
    parent: opts.parent,
    direction: 'vertical',
    padding: [24, 24, 24, 24],
    gap: 16,
    mainAlign: 'min',
    crossAlign: 'min',
    sizingH: opts.width ? 'fixed' : 'fill',
    sizingV: opts.height ? 'fixed' : 'hug',
    width: opts.width,
    height: opts.height,
    bgColor: tokens.card,
    borderColor: tokens.border,
    borderWidth: 1,
    cornerRadius: DESIGN_TOKENS.radii.lg
  });

  // Media / Illustration slot
  await client.createNode({
    type: 'rectangle',
    name: 'Media Placeholder',
    parent: card.id,
    height: 160,
    props: {
      fills: [{ type: 'solid', color: theme === 'dark' ? '#111827' : '#E2E8F0' }],
      cornerRadius: DESIGN_TOKENS.radii.md,
      sizingH: 'fill'
    }
  });

  // Tag / Badge
  if (opts.tag) {
    const tagFrame = await client.createAutoLayoutFrame({
      name: 'Tag',
      parent: card.id,
      direction: 'horizontal',
      padding: [4, 10, 4, 10],
      gap: 4,
      mainAlign: 'center',
      crossAlign: 'center',
      sizingH: 'hug',
      sizingV: 'hug',
      bgColor: theme === 'dark' ? '#1E293B' : '#DBEAFE',
      cornerRadius: DESIGN_TOKENS.radii.sm
    });

    await client.createNode({
      type: 'text',
      name: 'Tag Label',
      parent: tagFrame.id,
      text: sanitizeText(opts.tag),
      props: {
        fontSize: 11,
        fontWeight: 600,
        fills: [{ type: 'solid', color: tokens.primary }]
      }
    });
  }

  // Title
  await client.createNode({
    type: 'text',
    name: 'Card Title',
    parent: card.id,
    text: sanitizeText(opts.title),
    props: {
      fontSize: DESIGN_TOKENS.typography.h3.fontSize,
      fontWeight: DESIGN_TOKENS.typography.h3.fontWeight,
      fills: [{ type: 'solid', color: tokens.text }]
    }
  });

  // Body
  if (opts.body) {
    await client.createNode({
      type: 'text',
      name: 'Card Description',
      parent: card.id,
      text: sanitizeText(opts.body),
      props: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.45,
        fills: [{ type: 'solid', color: tokens.textMuted }]
      }
    });
  }

  // Price or Action
  if (opts.price || opts.buttonLabel) {
    const bottomRow = await client.createAutoLayoutFrame({
      name: 'Card Footer Row',
      parent: card.id,
      direction: 'horizontal',
      gap: 12,
      padding: 0,
      mainAlign: 'spaceBetween',
      crossAlign: 'center',
      sizingH: 'fill',
      sizingV: 'hug'
    });

    if (opts.price) {
      await client.createNode({
        type: 'text',
        name: 'Price',
        parent: bottomRow.id,
        text: sanitizeText(opts.price),
        props: {
          fontSize: 18,
          fontWeight: 700,
          fills: [{ type: 'solid', color: tokens.accent }]
        }
      });
    }

    if (opts.buttonLabel) {
      const actionBtn = await client.createAutoLayoutFrame({
        name: 'Action Button',
        parent: bottomRow.id,
        direction: 'horizontal',
        padding: [8, 16, 8, 16],
        gap: 6,
        mainAlign: 'center',
        crossAlign: 'center',
        sizingH: 'hug',
        sizingV: 'hug',
        bgColor: tokens.primary,
        cornerRadius: DESIGN_TOKENS.radii.sm
      });

      await client.createNode({
        type: 'text',
        name: 'Action Label',
        parent: actionBtn.id,
        text: sanitizeText(opts.buttonLabel),
        props: {
          fontSize: 13,
          fontWeight: 600,
          fills: [{ type: 'solid', color: '#FFFFFF' }]
        }
      });
    }
  }

  return { cardId: card.id };
}

