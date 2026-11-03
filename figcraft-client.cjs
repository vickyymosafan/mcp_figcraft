#!/usr/bin/env node
/**
 * FigCraft Live Control & Automation Client
 * Reverse-Engineered wire client for FigCraft GUI (Port 9099)
 * 
 * Flow Kanonik:
 * 1. Buat file .figcraft beserta namanya
 * 2. Otomatis buka file di GUI FigCraft (User tidak perlu buka manual)
 * 3. Live generate UI/UX di kanvas aktif
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const CONTROL_PORT = process.env.FIGCRAFT_CONTROL_PORT ? parseInt(process.env.FIGCRAFT_CONTROL_PORT, 10) : 9099;
const GUI_PATH = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft.exe';

function checkPort(port = CONTROL_PORT, host = '127.0.0.1', timeout = 300) {
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
    socket.connect(port, host);
  });
}

async function ensureFigCraftRunning() {
  const isRunning = await checkPort(CONTROL_PORT);
  if (isRunning) return true;

  console.log(`[FigCraft-Client] Meluncurkan jendela GUI FigCraft pada port ${CONTROL_PORT}...`);
  try {
    // Gunakan WMI agar proses terlepas mandiri dan jendela interaktif muncul di desktop
    execSync(`powershell -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '\\"${GUI_PATH}\\" --control ${CONTROL_PORT}' }"`, {
      stdio: 'ignore'
    });
  } catch (err) {
    // Fallback spawn
    const child = spawn(GUI_PATH, ['--control', CONTROL_PORT.toString()], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  }

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkPort(CONTROL_PORT)) {
      console.log(`[FigCraft-Client] FigCraft GUI berhasil terhubung pada port ${CONTROL_PORT}.`);
      return true;
    }
  }
  throw new Error(`Timeout: Jendela GUI FigCraft gagal merespons pada port ${CONTROL_PORT}`);
}

function sendCommand(method, params = {}) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';

    socket.connect(CONTROL_PORT, '127.0.0.1', () => {
      const msg = JSON.stringify({
        id: Date.now(),
        method,
        params
      }) + '\n';
      socket.write(msg);
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('\n')) {
        try {
          const parsed = JSON.parse(buffer.trim());
          socket.destroy();
          if (parsed.ok === false) {
            reject(new Error(parsed.error || 'FigCraft command failed'));
          } else {
            resolve(parsed.result ?? parsed);
          }
        } catch (e) {
          socket.destroy();
          reject(e);
        }
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
        reject(new Error('Timeout berkomunikasi dengan FigCraft GUI di port ' + CONTROL_PORT));
      }
    }, 5000);
  });
}

async function executeEngineCommand(command, params = {}) {
  await ensureFigCraftRunning();
  return sendCommand('engine.execute', {
    agent: 'ai-orchestrator',
    command,
    params
  });
}

/**
 * Langkah 1: Buat template file .figcraft kanonik jika belum ada
 */
function createCanonicalFigCraftFile(filePath, projectName = 'New Project') {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(resolved)) {
    console.log(`[Langkah 1] File sudah ada di disk: ${resolved}`);
    return resolved;
  }

  // Struktur kanonik FigCraft ZIP (.figcraft)
  const docJson = {
    format: "figcraft",
    version: 1,
    imageIndex: [],
    name: projectName,
    pages: [1],
    nodes: {
      "1": {
        id: 1,
        name: "Page 1",
        type: "page",
        background: { r: 0.11764706, g: 0.11764706, b: 0.11764706, a: 1.0 },
        flows: [],
        prototype: {
          device: "None",
          background: { r: 0.11764706, g: 0.11764706, b: 0.11764706, a: 1.0 },
          rotation: "portrait"
        },
        width: 0.0,
        height: 0.0
      }
    },
    next_id: 2,
    styles: [],
    variables: { collections: [], variables: [] },
    current_page: 1,
    document_colors: [],
    comments: []
  };

  const jsonStr = JSON.stringify(docJson);

  // Buat ZIP menggunakan powershell Compress-Archive bawaan Windows
  const tempDir = path.join(path.dirname(resolved), `_temp_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'document.json'), jsonStr, 'utf8');

  const zipPath = path.join(tempDir, 'out.zip');
  execSync(`powershell -Command "Compress-Archive -Path '${path.join(tempDir, 'document.json')}' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'ignore'
  });

  fs.copyFileSync(zipPath, resolved);

  // Cleanup temp
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`[Langkah 1] Berhasil membuat berkas .figcraft baru: "${projectName}" -> ${resolved}`);
  return resolved;
}

/**
 * Langkah 2: Otomatis Buka File di FigCraft GUI (User tidak perlu membuka manual)
 */
async function openFileInFigCraft(filePath) {
  const resolved = path.resolve(filePath);
  console.log(`[Langkah 2] Otomatis membuka file di jendela FigCraft GUI: ${resolved}`);
  const res = await executeEngineCommand('file.open', { path: resolved });
  console.log(`[Langkah 2] File berhasil dibuka di tab aktif jendela FigCraft!`);
  return res;
}

/**
 * Alur 1-by-1 Lengkap:
 * 1. Buat file beserta namanya
 * 2. Otomatis langsung buka file di FigCraft
 */
async function createAndOpenFile(filePath, projectName) {
  const name = projectName || path.basename(filePath, path.extname(filePath));
  console.log(`=== Memulai Alur FigCraft Otomatis ===`);
  const resolvedPath = createCanonicalFigCraftFile(filePath, name);
  const openResult = await openFileInFigCraft(resolvedPath);
  console.log(`=== File siap untuk Live UI/UX Generation ===\n`);
  return { path: resolvedPath, name, result: openResult };
}

/**
 * Langkah 3: Live UI/UX Generation Helpers
 */
async function createNode(nodeDef) {
  return executeEngineCommand('node.create', nodeDef);
}

async function batchCommands(commands) {
  return executeEngineCommand('batch', { commands });
}

async function inspectDocument() {
  await ensureFigCraftRunning();
  return sendCommand('document.inspect', { allPages: false, depth: 4 });
}

async function saveActiveDocument() {
  return executeEngineCommand('file.save', {});
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0] || 'help';

  (async () => {
    try {
      if (action === 'create-open') {
        const filePath = args[1] || 'test-ui/ux/project.figcraft';
        const name = args[2] || 'New Project';
        await createAndOpenFile(filePath, name);
      } else if (action === 'open') {
        const filePath = args[1];
        if (!filePath) throw new Error('Path file diperlukan. Contoh: node figcraft-client.cjs open test-ui/ux/app.figcraft');
        await openFileInFigCraft(filePath);
      } else if (action === 'save') {
        const res = await saveActiveDocument();
        console.log('[Save Document]: Berhasil disimpan.', res);
      } else if (action === 'inspect') {
        const doc = await inspectDocument();
        console.log(JSON.stringify(doc, null, 2));
      } else {
        console.log(`
Usage:
  node figcraft-client.cjs create-open <file.figcraft> [ProjectName]
  node figcraft-client.cjs open <file.figcraft>
  node figcraft-client.cjs save
  node figcraft-client.cjs inspect
        `);
      }
    } catch (err) {
      console.error('[FigCraft-Client Error]:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  ensureFigCraftRunning,
  createCanonicalFigCraftFile,
  openFileInFigCraft,
  createAndOpenFile,
  createNode,
  batchCommands,
  inspectDocument,
  saveActiveDocument,
  executeEngineCommand
};
