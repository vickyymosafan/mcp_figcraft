import * as net from 'node:net';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { createCanonicalFigCraftFile } from './template.js';
import {
  buildAutoLayoutNodeParams,
  DESIGN_TOKENS,
  normalizeCrossAlign,
  normalizeMainAlign,
  sanitizeText
} from './layout.js';
import {
  createCardComponent,
  createHeroComponent,
  createNavbarComponent,
  createResponsiveArtboards,
  type ResponsiveArtboardsOptions
} from './components.js';
import { auditCanvasDocument, autoRepairCanvasOverflows } from './audit.js';
import type {
  AutoLayoutFrameParams,
  CreateNodeParams,
  DocumentSummary,
  FigCraftNodeProps,
  FigCraftResponse,
  LayoutAuditReport,
  ResponsiveSystemResult
} from './types.js';

export const DEFAULT_CONTROL_PORT = 9099;
export const DEFAULT_GUI_PATH = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft.exe';

export class FigCraftClient {
  public readonly port: number;
  public readonly guiPath: string;

  constructor(port: number = DEFAULT_CONTROL_PORT, guiPath: string = DEFAULT_GUI_PATH) {
    this.port = port;
    this.guiPath = process.env.FIGCRAFT_GUI_PATH || guiPath;
  }

  public checkPort(host = '127.0.0.1', timeout = 350): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        resolve(false);
      });
      socket.connect(this.port, host);
    });
  }

  public async ensureRunning(maxRetries = 24, delayMs = 250): Promise<boolean> {
    const isRunning = await this.checkPort();
    if (isRunning) return true;

    if (!fs.existsSync(this.guiPath)) {
      throw new Error(`FigCraft GUI binary tidak ditemukan pada path: ${this.guiPath}`);
    }

    try {
      if (process.platform === 'win32') {
        execSync(
          `powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '\\"${this.guiPath}\\" --control ${this.port}' }"`,
          { stdio: 'ignore' }
        );
      } else {
        const child = spawn(this.guiPath, ['--control', this.port.toString()], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      }
    } catch {
      const child = spawn(this.guiPath, ['--control', this.port.toString()], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.unref();
    }

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (await this.checkPort()) {
        return true;
      }
    }

    throw new Error(`Timeout: Jendela GUI FigCraft gagal merespons pada port ${this.port}`);
  }

  public sendCommand<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let buffer = '';

      socket.connect(this.port, '127.0.0.1', () => {
        const payload = JSON.stringify({
          id: Date.now(),
          method,
          params
        }) + '\n';
        socket.write(payload);
      });

      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        if (buffer.includes('\n')) {
          try {
            const parsed: FigCraftResponse<T> = JSON.parse(buffer.trim());
            socket.destroy();
            if (parsed.ok === false) {
              reject(new Error(parsed.error || 'FigCraft command rejected'));
            } else {
              resolve((parsed.result ?? parsed) as T);
            }
          } catch (err) {
            socket.destroy();
            reject(err);
          }
        }
      });

      socket.on('error', (err: Error) => {
        socket.destroy();
        reject(err);
      });

      setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
          reject(new Error(`Timeout socket request to FigCraft GUI on port ${this.port}`));
        }
      }, 8000);
    });
  }

  public async executeEngineCommand<T = unknown>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureRunning();
    return this.sendCommand<T>('engine.execute', {
      agent: 'figcraft-mcp-agent',
      command,
      params
    });
  }

  /**
   * Alur Utama 1-per-1:
   * 1. Buat file .figcraft beserta namanya di disk
   * 2. Otomatis buka file di FigCraft GUI (User tidak perlu membuka manual)
   */
  public async createAndOpenFile(filePath: string, projectName?: string) {
    const name = projectName || path.basename(filePath, path.extname(filePath));
    const resolvedPath = createCanonicalFigCraftFile(filePath, name);
    const result = await this.openFile(resolvedPath);
    return {
      path: resolvedPath,
      name,
      result
    };
  }

  public async openFile(filePath: string) {
    const resolved = path.resolve(filePath);
    return this.executeEngineCommand('file.open', { path: resolved });
  }

  /**
   * Creates a canvas node with automatic text sanitization, auto-wrapping, and alignment normalization.
   */
  public async createNode(params: CreateNodeParams) {
    const normalizedParams: Record<string, unknown> = { ...params };

    // 1. Text Sanitization: Prevent literal "\n" bugs
    if (typeof params.text === 'string') {
      normalizedParams.text = sanitizeText(params.text);
    }
    if (typeof params.characters === 'string') {
      normalizedParams.characters = sanitizeText(params.characters);
    }

    // 2. Normalization of Auto-Layout alignments & props
    const props = params.props ? { ...params.props } : {};
    if (props.mainAlign) {
      props.mainAlign = normalizeMainAlign(props.mainAlign as any);
    }
    if (props.crossAlign) {
      props.crossAlign = normalizeCrossAlign(props.crossAlign as any);
    }

    // 3. Automatic Anti-Overflow for Text Nodes: Default to textAutoResize: 'height'
    if (params.type === 'text') {
      if (!props.textAutoResize) {
        // If text contains newlines or has width, default to height wrapping so it doesn't overflow!
        const textContent = (normalizedParams.text as string) || (normalizedParams.characters as string) || '';
        if (textContent.includes('\n') || params.width !== undefined || props.sizingH === 'fill') {
          props.textAutoResize = 'height';
        }
      }
    }

    normalizedParams.props = props;
    return this.executeEngineCommand<{ id: number }>('node.create', normalizedParams);
  }

  /**
   * Creates an Auto-Layout container with flexbox mechanics (vertical/horizontal, gap, padding, alignment).
   */
  public async createAutoLayoutFrame(params: AutoLayoutFrameParams): Promise<{ id: number }> {
    const nodeParams = buildAutoLayoutNodeParams(params);
    return this.createNode(nodeParams);
  }

  /**
   * Generates synchronized responsive artboards (Desktop 1440, Tablet 768, Mobile 375).
   */
  public async createResponsiveSystem(options?: ResponsiveArtboardsOptions): Promise<ResponsiveSystemResult> {
    return createResponsiveArtboards(this, options);
  }

  /**
   * Creates atomic UI components with nested Auto-Layout structures.
   */
  public async createComponent(type: 'navbar' | 'hero' | 'card', options: Record<string, unknown>): Promise<{ id: number }> {
    if (type === 'navbar') {
      const res = await createNavbarComponent(this, options as any);
      return { id: res.containerId };
    }
    if (type === 'hero') {
      const res = await createHeroComponent(this, options as any);
      return { id: res.containerId };
    }
    if (type === 'card') {
      const res = await createCardComponent(this, options as any);
      return { id: res.cardId };
    }
    throw new Error(`Tipe komponen "${type}" tidak didukung. Pilihan: 'navbar', 'hero', 'card'.`);
  }

  public async setProperties(id: number, props: FigCraftNodeProps) {
    const normalizedProps: Record<string, unknown> = { ...props };
    if (props.mainAlign) {
      normalizedProps.mainAlign = normalizeMainAlign(props.mainAlign as any);
    }
    if (props.crossAlign) {
      normalizedProps.crossAlign = normalizeCrossAlign(props.crossAlign as any);
    }
    if (typeof props.characters === 'string') {
      normalizedProps.characters = sanitizeText(props.characters);
    }
    return this.executeEngineCommand('node.set', { id, props: normalizedProps });
  }

  public async batch(commands: Array<{ command: string; params: Record<string, unknown> }>) {
    const results = [];
    for (const cmd of commands) {
      if (cmd.command === 'node.set') {
        const id = (cmd.params as any).id;
        const props = (cmd.params as any).props;
        results.push(await this.setProperties(id, props));
      } else {
        results.push(await this.executeEngineCommand(cmd.command, cmd.params));
      }
    }
    return results;
  }

  public async inspectDocument(depth: number = 4, allPages: boolean = false): Promise<DocumentSummary> {
    await this.ensureRunning();
    return this.sendCommand<DocumentSummary>('document.inspect', { depth, allPages });
  }

  /**
   * Runs an automated design and layout quality audit on the active canvas.
   * Checks for overflow boundaries, flat layers, unescaped text strings, and responsive coverage.
   */
  public async auditLayout(): Promise<LayoutAuditReport> {
    const doc = await this.inspectDocument(6, true);
    return auditCanvasDocument(doc);
  }

  /**
   * Automatically repairs all overflowing text nodes and escaped newlines on the active canvas.
   */
  public async fixCanvasOverflow(): Promise<{ repairedCount: number; repairedNodes: Array<{ id: number; name: string; action: string }> }> {
    return autoRepairCanvasOverflows(this);
  }

  /**
   * Applies the Modern Luxury Obsidian Titanium theme across key canvas containers.
   */
  public async applyLuxuryTheme(): Promise<{ status: string }> {
    const doc = await this.inspectDocument(6, true);
    const tokens = DESIGN_TOKENS.colors.luxury;
    let updated = 0;

    const traverse = async (node: any) => {
      if (!node.id) return;
      const name = (node.name || '').toLowerCase();
      const nodeType = (node.type || '').toLowerCase();

      // CTA Buttons (Gold glow)
      if (name.includes('cta') && (name.includes('btn') || name.includes('1') || name.includes('cart') || name.includes('pay'))) {
        if (nodeType === 'frame') {
          await this.setProperties(node.id, {
            fills: [{ type: 'solid', color: tokens.primary }],
            cornerRadius: 12,
            effects: [{ type: 'dropShadow', color: tokens.primaryGlow, offset: [0, 6], radius: 24 }]
          });
          updated++;
        }
      }

      // Cards (Obsidian Glass)
      if (name.includes('card') || name.includes('box') || name.includes('stage') || name.includes('spec')) {
        if (nodeType === 'frame') {
          await this.setProperties(node.id, {
            fills: [{ type: 'solid', color: tokens.card }],
            strokes: [{ type: 'solid', color: tokens.border }],
            strokeWeight: 1,
            cornerRadius: 20,
            cornerSmoothing: 0.6,
            effects: [{ type: 'dropShadow', color: '#00000080', offset: [0, 12], radius: 32 }]
          });
          updated++;
        }
      }

      // Badges
      if (name.includes('badge')) {
        if (nodeType === 'frame') {
          await this.setProperties(node.id, {
            fills: [{ type: 'solid', color: tokens.badgeEmeraldBg }],
            strokes: [{ type: 'solid', color: tokens.badgeEmeraldBorder }],
            strokeWeight: 1,
            cornerRadius: 9999
          });
          updated++;
        } else if (nodeType === 'text') {
          await this.setProperties(node.id, {
            fills: [{ type: 'solid', color: tokens.badgeEmeraldText }],
            fontWeight: 700
          });
          updated++;
        }
      }

      // Prices
      if (name.includes('price')) {
        if (nodeType === 'text') {
          await this.setProperties(node.id, {
            fills: [{ type: 'solid', color: tokens.primary }],
            fontWeight: 800
          });
          updated++;
        }
      }

      if (node.children) {
        for (const c of node.children) {
          await traverse(c);
        }
      }
    };

    const pages = (doc.pages || []) as any[];
    for (const p of pages) {
      if (p.children) {
        for (const root of p.children) {
          await traverse(root);
        }
      }
    }

    return { status: `Berhasil memperbarui ${updated} elemen ke tema Luxury Obsidian Titanium!` };
  }

  public async saveFile(targetPath?: string) {
    return this.executeEngineCommand('file.save', targetPath ? { path: targetPath } : {});
  }

  public async screenshot(ids?: number[], scale: number = 1) {
    return this.executeEngineCommand('file.export', {
      ids,
      format: 'png',
      scale
    });
  }
}
