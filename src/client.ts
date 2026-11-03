import * as net from 'node:net';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { createCanonicalFigCraftFile } from './template.js';
import {
  buildAutoLayoutNodeParams,
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
import { auditCanvasDocument } from './audit.js';
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
   * Creates a canvas node with automatic text sanitization and alignment normalization.
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

    // 2. Normalization of Auto-Layout alignments
    if (params.props) {
      const normalizedProps: Record<string, unknown> = { ...params.props };
      if (params.props.mainAlign) {
        normalizedProps.mainAlign = normalizeMainAlign(params.props.mainAlign as any);
      }
      if (params.props.crossAlign) {
        normalizedProps.crossAlign = normalizeCrossAlign(params.props.crossAlign as any);
      }
      normalizedParams.props = normalizedProps;
    }

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
    return this.executeEngineCommand('node.set', { id, props: normalizedProps });
  }

  public async batch(commands: Array<{ command: string; params: Record<string, unknown> }>) {
    return this.executeEngineCommand('batch', { commands });
  }

  public async inspectDocument(depth: number = 4, allPages: boolean = false): Promise<DocumentSummary> {
    await this.ensureRunning();
    return this.sendCommand<DocumentSummary>('document.inspect', { depth, allPages });
  }

  /**
   * Runs an automated design and layout quality audit on the active canvas.
   * Checks for flat layers, unescaped text strings, and responsive coverage.
   */
  public async auditLayout(): Promise<LayoutAuditReport> {
    const doc = await this.inspectDocument(6, true);
    return auditCanvasDocument(doc);
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
