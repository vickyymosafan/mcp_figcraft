#!/usr/bin/env node
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI_PATH = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const GUI_PATH = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft.exe';
const CONTROL_PORT = process.env.FIGCRAFT_CONTROL_PORT ? parseInt(process.env.FIGCRAFT_CONTROL_PORT, 10) : 9099;

function checkPort(port, host = '127.0.0.1', timeout = 350) {
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

async function waitForPort(port, maxAttempts = 16, delayMs = 250) {
  for (let i = 0; i < maxAttempts; i++) {
    const active = await checkPort(port);
    if (active) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function main() {
  let isLiveGuiRunning = await checkPort(CONTROL_PORT);
  let guiProcess = null;

  // Jika FigCraft GUI belum aktif dengan --control 9099, jalankan secara otomatis
  if (!isLiveGuiRunning && fs.existsSync(GUI_PATH)) {
    console.error(`[FigCraft-Bridge] FigCraft GUI belum aktif pada port ${CONTROL_PORT}. Meluncurkan otomatis jendela live...`);
    try {
      guiProcess = spawn(GUI_PATH, ['--control', CONTROL_PORT.toString()], {
        stdio: 'ignore',
        detached: true,
        windowsHide: false
      });
      guiProcess.unref();

      // Tunggu hingga server kontrol siap
      isLiveGuiRunning = await waitForPort(CONTROL_PORT, 24, 250);
      if (isLiveGuiRunning) {
        console.error(`[FigCraft-Bridge] FigCraft GUI berhasil diluncurkan & mendengarkan pada port ${CONTROL_PORT}.`);
      } else {
        console.error(`[FigCraft-Bridge] Timeout menunggu GUI pada port ${CONTROL_PORT}. Beralih ke fallback headless.`);
      }
    } catch (launchErr) {
      console.error(`[FigCraft-Bridge] Gagal meluncurkan GUI: ${launchErr.message}`);
    }
  }

  const args = ['mcp'];
  if (isLiveGuiRunning) {
    console.error(`[FigCraft-Bridge] Terhubung ke jendela FigCraft GUI Live pada 127.0.0.1:${CONTROL_PORT}`);
    args.push('--attach', CONTROL_PORT.toString());
  } else {
    console.error(`[FigCraft-Bridge] FigCraft GUI tidak terdeteksi. Berjalan dalam mode headless engine.`);
  }

  const child = spawn(CLI_PATH, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true
  });

  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });

  const cleanup = () => {
    try {
      if (child && !child.killed) child.kill('SIGTERM');
    } catch (_) {}
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('[FigCraft-Bridge] Error:', err);
  process.exit(1);
});
