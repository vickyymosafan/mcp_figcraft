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
 * unescaped text literals, flat layer hierarchies, and missing responsive viewports.
 * Formats results as Harness MCP-compatible evidence.
 */
export function auditCanvasDocument(doc: DocumentSummary): LayoutAuditReport {
  const violations: LayoutAuditViolation[] = [];
  let totalNodes = 0;
  let autoLayoutFrameCount = 0;
  let flatRootChildrenCount = 0;

  let desktopFound = false;
  let tabletFound = false;
  let mobileFound = false;

  const pages = (doc.pages || []) as Array<{ children?: RawNode[] }>;

  function traverse(node: RawNode, depth = 0, isRootChild = false) {
    totalNodes++;
    const nodeType = (node.type || '').toLowerCase();

    // Check for responsive artboards on top-level frames
    if (depth === 1 && nodeType === 'frame' && node.absoluteBounds) {
      const w = node.absoluteBounds.width;
      if (w >= 1200) desktopFound = true;
      else if (w >= 600 && w < 1200) tabletFound = true;
      else if (w >= 320 && w < 600) mobileFound = true;
    }

    // Check for Auto-Layout adoption
    if (nodeType === 'frame') {
      const mode = typeof node.layout === 'object' && node.layout !== null ? node.layout.mode : node.layout;
      if (mode === 'vertical' || mode === 'horizontal') {
        autoLayoutFrameCount++;
      }
    }

    // Check for flat primitive children inside root frames (Spaghetti layers bug)
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

    // Check for unescaped literal newline bug (e.g. "Architectural Sound.\nRend...")
    if (nodeType === 'text' && typeof node.characters === 'string') {
      if (node.characters.includes('\\n')) {
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
        traverse(child, depth + 1, isNextRootChild);
      }
    }
  }

  // Also traverse nodes dictionary if available
  if (doc.nodes && typeof doc.nodes === 'object') {
    for (const val of Object.values(doc.nodes)) {
      const n = val as RawNode;
      if ((n.type || '').toLowerCase() === 'page' && Array.isArray(n.children)) {
        for (const child of n.children) {
          traverse(child, 1, false);
        }
      }
    }
  }

  for (const page of pages) {
    if (page.children && Array.isArray(page.children)) {
      for (const rootNode of page.children) {
        traverse(rootNode, 1, false);
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
    if (v.severity === 'error') score -= 15;
    else if (v.severity === 'warning') score -= 5;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  const passed = score >= 80 && !violations.some((v) => v.severity === 'error');

  return {
    score,
    passed,
    totalNodes,
    autoLayoutFrameCount,
    flatRootChildrenCount,
    responsiveArtboards: {
      desktopFound,
      tabletFound,
      mobileFound
    },
    violations,
    harnessEvidence: {
      checkpoint: 'responsive-design-and-layout-integrity',
      status: passed ? 'pass' : 'fail',
      summary: `FigCraft Canvas Quality Score: ${score}/100. Auto-Layout Containers: ${autoLayoutFrameCount}, Flat layers: ${flatRootChildrenCount}, Responsive Coverage: Desktop=${desktopFound}, Tablet=${tabletFound}, Mobile=${mobileFound}.`,
      metrics: {
        autoLayoutAdoption: `${autoLayoutFrameCount} containers`,
        responsiveCoverage: `${(desktopFound ? 1 : 0) + (tabletFound ? 1 : 0) + (mobileFound ? 1 : 0)}/3 viewports`,
        cleanTextAdoption: violations.some((v) => v.rule === 'unescaped-newlines') ? 'Failed (Contains literal \\n)' : 'Passed'
      }
    }
  };
}
