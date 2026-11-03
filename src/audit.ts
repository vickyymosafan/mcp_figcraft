import type { FigCraftClient } from './client.js';
import type { DocumentSummary, LayoutAuditReport, LayoutAuditViolation } from './types.js';

interface RawNode {
  id?: number;
  name?: string;
  type?: string;
  characters?: string;
  layout?: { mode?: string; gap?: number; padding?: unknown; mainAlign?: string; crossAlign?: string } | string;
  children?: RawNode[];
  absoluteBounds?: { x: number; y: number; width: number; height: number };
  [key: string]: unknown;
}

/**
 * Recursively audits the FigCraft canvas document hierarchy to identify design defects,
 * unescaped text literals, flat layer hierarchies, missing responsive viewports,
 * and overflowing content boundaries.
 * Formats results as Harness MCP-compatible evidence.
 */
export function auditCanvasDocument(doc: DocumentSummary): LayoutAuditReport {
  const violations: LayoutAuditViolation[] = [];
  let totalNodes = 0;
  let autoLayoutFrameCount = 0;
  let flatRootChildrenCount = 0;
  let overflowCount = 0;
  let escapedNewlineCount = 0;

  let desktopFound = false;
  let tabletFound = false;
  let mobileFound = false;

  const pages = (doc.pages || []) as Array<{ children?: RawNode[] }>;

  function traverse(node: RawNode, depth = 0, parentNode: RawNode | null = null, isRootChild = false) {
    totalNodes++;
    const nodeType = (node.type || '').toLowerCase();

    // 1. Check for responsive artboards on top-level frames
    if (depth === 1 && nodeType === 'frame' && node.absoluteBounds) {
      const w = node.absoluteBounds.width;
      if (w >= 1200) desktopFound = true;
      else if (w >= 600 && w < 1200) tabletFound = true;
      else if (w >= 320 && w < 600) mobileFound = true;
    }

    // 2. Check for Auto-Layout adoption
    if (nodeType === 'frame') {
      const mode = typeof node.layout === 'object' && node.layout !== null ? node.layout.mode : node.layout;
      if (mode === 'vertical' || mode === 'horizontal') {
        autoLayoutFrameCount++;
      }
    }

    // 3. Check for boundary overflow (Text or element wider than parent)
    if (parentNode && parentNode.absoluteBounds && node.absoluteBounds) {
      const childRight = node.absoluteBounds.x + node.absoluteBounds.width;
      const parentRight = parentNode.absoluteBounds.x + parentNode.absoluteBounds.width;
      if (childRight > parentRight + 2) {
        overflowCount++;
        const overflowAmount = Math.round(childRight - parentRight);
        violations.push({
          rule: 'overflow',
          severity: 'error',
          nodeId: node.id,
          nodeName: node.name,
          message: `Layer "${node.name || 'Unnamed'}" (${nodeType}) melebihi batas kontainer "${parentNode.name || 'Parent'}" sebesar ${overflowAmount}px ke kanan!`,
          recommendation: `Terapkan textAutoResize: 'height' dan sizingH: 'fill', atau batasi width agar sesuai ruang kontainer.`
        });
      }
    }

    // 4. Check for flat primitive children inside root frames (Spaghetti layers bug)
    if (isRootChild && (nodeType === 'text' || nodeType === 'rectangle' || nodeType === 'vector')) {
      flatRootChildrenCount++;
      violations.push({
        rule: 'flat-hierarchy',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: `Layer "${node.name || 'Unnamed'}" adalah elemen primitif langsung di dalam root frame tanpa kontainer Auto-Layout.`,
        recommendation: `Bungkus layer ini ke dalam Auto-Layout frame (misalnya: Section, Card, atau Navbar stack) agar layout tidak berantakan.`
      });
    }

    // 5. Check for unescaped literal newline bug (e.g. "Architectural Sound.\nRend...")
    if (nodeType === 'text' && typeof node.characters === 'string') {
      if (node.characters.includes('\\n')) {
        escapedNewlineCount++;
        violations.push({
          rule: 'unescaped-newlines',
          severity: 'error',
          nodeId: node.id,
          nodeName: node.name,
          message: `Teks pada layer "${node.name || 'Text'}" mengandung karakter escaped "\\n" mentah: "${node.characters.slice(0, 35)}..."`,
          recommendation: `Gunakan fungsi sanitizeText() atau text.replace(/\\\\n/g, '\\n') agar kanvas merender line-break nyata.`
        });
      }
    }

    if (node.children && Array.isArray(node.children)) {
      const isNextRootChild = depth === 1 && nodeType === 'frame';
      for (const child of node.children) {
        traverse(child, depth + 1, nodeType === 'frame' ? node : parentNode, isNextRootChild);
      }
    }
  }

  // Traverse document pages
  for (const page of pages) {
    if (page.children && Array.isArray(page.children)) {
      for (const rootNode of page.children) {
        traverse(rootNode, 1, null, false);
      }
    }
  }

  // Check responsive coverage
  if (!desktopFound || !tabletFound || !mobileFound) {
    violations.push({
      rule: 'missing-responsive',
      severity: 'warning',
      message: `Kanvas belum memiliki sistem artboard responsif lengkap. Terdeteksi: Desktop=${desktopFound ? '✅' : '❌'}, Tablet=${tabletFound ? '✅' : '❌'}, Mobile=${mobileFound ? '✅' : '❌'}.`,
      recommendation: `Jalankan tool figcraft_create_responsive_system untuk menghasilkan frame Desktop (1440), Tablet (768), dan Mobile (375) secara berdampingan.`
    });
  }

  // Calculate score
  let score = 100;
  for (const v of violations) {
    if (v.severity === 'error') score -= 20;
    else if (v.severity === 'warning') score -= 5;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  const passed = score >= 80 && overflowCount === 0 && escapedNewlineCount === 0;

  return {
    score,
    passed,
    totalNodes,
    autoLayoutFrameCount,
    flatRootChildrenCount,
    overflowCount,
    escapedNewlineCount,
    responsiveArtboards: {
      desktopFound,
      tabletFound,
      mobileFound
    },
    violations,
    harnessEvidence: {
      checkpoint: 'responsive-design-and-layout-integrity',
      status: passed ? 'pass' : 'fail',
      summary: `FigCraft Canvas Quality Score: ${score}/100. Overflows: ${overflowCount}, Escaped Newlines: ${escapedNewlineCount}, Auto-Layout Containers: ${autoLayoutFrameCount}, Flat layers: ${flatRootChildrenCount}, Responsive Coverage: Desktop=${desktopFound}, Tablet=${tabletFound}, Mobile=${mobileFound}.`,
      metrics: {
        autoLayoutAdoption: `${autoLayoutFrameCount} containers`,
        responsiveCoverage: `${(desktopFound ? 1 : 0) + (tabletFound ? 1 : 0) + (mobileFound ? 1 : 0)}/3 viewports`,
        cleanTextAdoption: escapedNewlineCount === 0 ? 'Passed (0 literal \\n)' : `Failed (${escapedNewlineCount} literal \\n)`,
        overflowIntegrity: overflowCount === 0 ? 'Passed (Zero DOM/Canvas Overflow)' : `Failed (${overflowCount} overflows detected)`
      }
    }
  };
}

/**
 * Scans the active canvas and automatically repairs all overflowing text nodes and escaped newlines.
 */
export async function autoRepairCanvasOverflows(client: FigCraftClient): Promise<{ repairedCount: number; repairedNodes: Array<{ id: number; name: string; action: string }> }> {
  const doc = await client.inspectDocument(6, true);
  const repairedNodes: Array<{ id: number; name: string; action: string }> = [];

  async function checkAndRepair(node: RawNode, parent: RawNode | null) {
    if (!node.id) return;
    const nodeType = (node.type || '').toLowerCase();

    // 1. Repair escaped newlines
    if (nodeType === 'text' && typeof node.characters === 'string' && node.characters.includes('\\n')) {
      const sanitized = node.characters.replace(/\\n/g, '\n').replace(/\\r/g, '');
      await client.setProperties(node.id, {
        characters: sanitized,
        textAutoResize: 'height'
      });
      repairedNodes.push({
        id: node.id,
        name: node.name || 'Text',
        action: 'Sanitized literal \\n to real multiline breaks and enabled textAutoResize: height'
      });
    }

    // 2. Repair horizontal overflow
    if (parent && parent.absoluteBounds && node.absoluteBounds) {
      const childRight = node.absoluteBounds.x + node.absoluteBounds.width;
      const parentRight = parent.absoluteBounds.x + parent.absoluteBounds.width;
      if (childRight > parentRight + 2) {
        if (nodeType === 'text') {
          const availableWidth = Math.max(100, Math.round(parent.absoluteBounds.width - 48));
          await client.setProperties(node.id, {
            textAutoResize: 'height',
            width: availableWidth,
            sizingH: 'fill'
          });
          repairedNodes.push({
            id: node.id,
            name: node.name || 'Text',
            action: `Constrained width to ${availableWidth}px and set textAutoResize: height`
          });
        } else {
          // Frame or element overflow
          if (node.absoluteBounds.x >= parentRight - 20) {
            const newX = Math.max(10, Math.round(parent.absoluteBounds.width - node.absoluteBounds.width - 20));
            await client.setProperties(node.id, { x: newX });
            repairedNodes.push({
              id: node.id,
              name: node.name || 'Element',
              action: `Repositioned x from ${node.absoluteBounds.x} to ${newX}px inside parent`
            });
          }
        }
      }
    }

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        await checkAndRepair(child, nodeType === 'frame' ? node : parent);
      }
    }
  }

  const pages = (doc.pages || []) as Array<{ children?: RawNode[] }>;
  for (const page of pages) {
    if (page.children) {
      for (const root of page.children) {
        await checkAndRepair(root, null);
      }
    }
  }

  return {
    repairedCount: repairedNodes.length,
    repairedNodes
  };
}
