import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FigCraftClient } from './client.js';

export function createFigCraftServer(client: FigCraftClient = new FigCraftClient()): McpServer {
  const server = new McpServer({
    name: 'figcraft-mcp-server',
    version: '1.0.0'
  });

  // Tool 1: Core 1-by-1 Flow: Create file with name and immediately auto-open in FigCraft GUI
  server.registerTool(
    'figcraft_create_and_open',
    {
      description:
        'Langkah 1 & 2 Kanonik: Buat berkas kanvas (.figcraft) beserta namanya, dan otomatis LANGSUNG buka berkas tersebut di jendela aktif FigCraft GUI di monitor user tanpa perlu user buka manual.',
      inputSchema: z.object({
        filePath: z.string().describe('Path file kanvas tujuan (contoh: test-ui/ux/app.figcraft)'),
        projectName: z.string().optional().describe('Nama proyek desain (contoh: Smart Manufacturing Portal)')
      })
    },
    async ({ filePath, projectName }) => {
      try {
        const res = await client.createAndOpenFile(filePath, projectName);
        return {
          content: [
            {
              type: 'text',
              text: `✅ [Langkah 1 & 2 Berhasil]: Berkas "${res.name}" berhasil dibuat dan otomatis langsung dibuka di jendela aktif FigCraft GUI!\nPath: ${res.path}\nSiap untuk Live UI/UX Generation (Langkah 3).`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal membuka berkas FigCraft secara otomatis: ${msg}` }]
        };
      }
    }
  );

  // Tool 2: Open File
  server.registerTool(
    'figcraft_open_file',
    {
      description: 'Buka berkas desain (.figcraft, .json, .fig, .sketch, .svg, gambar) ke tab aktif di GUI FigCraft.',
      inputSchema: z.object({
        filePath: z.string().describe('Path berkas yang akan dibuka')
      })
    },
    async ({ filePath }) => {
      try {
        const res = await client.openFile(filePath);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Berkas berhasil dibuka di FigCraft GUI: ${filePath}\nDetail: ${JSON.stringify(res)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal membuka file: ${msg}` }]
        };
      }
    }
  );

  // Tool 3: Create Node (Live Canvas Generation)
  server.registerTool(
    'figcraft_create_node',
    {
      description:
        'Langkah 3 Kanonik: Gambar elemen visual (frame, rectangle, text, ellipse, button, dll) secara LIVE langsung di kanvas yang sedang terbuka.',
      inputSchema: z.object({
        type: z
          .enum(['frame', 'rectangle', 'ellipse', 'text', 'section', 'vector', 'component', 'line', 'arrow', 'star', 'polygon'])
          .describe('Tipe node layer'),
        name: z.string().optional().describe('Nama layer'),
        parent: z.number().optional().describe('ID parent frame (default: current page)'),
        x: z.number().optional().describe('Posisi X relatif terhadap parent'),
        y: z.number().optional().describe('Posisi Y relatif terhadap parent'),
        width: z.number().optional().describe('Lebar layer dalam pixel'),
        height: z.number().optional().describe('Tinggi layer dalam pixel'),
        text: z.string().optional().describe('Isi teks (jika type = text)'),
        props: z.record(z.string(), z.any()).optional().describe('Properti visual: fills, strokes, cornerRadius, fontSize, fontFamily, fontWeight (angka, e.g. 700), layout, gap, padding, dll.')
      })
    },
    async (params) => {
      try {
        const res = await client.createNode(params as any);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Node ${params.type} "${params.name || ''}" berhasil dibuat live di kanvas! (Node ID: ${res.id})`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal membuat node di kanvas FigCraft: ${msg}` }]
        };
      }
    }
  );

  // Tool 4: Set Properties
  server.registerTool(
    'figcraft_set_properties',
    {
      description: 'Ubah properti visual (fills, stroke, tipografi, corner radius, auto-layout) pada node yang ada di kanvas.',
      inputSchema: z.object({
        id: z.number().describe('ID layer yang akan diubah'),
        props: z.record(z.string(), z.any()).describe('Properti yang diubah')
      })
    },
    async ({ id, props }) => {
      try {
        const res = await client.setProperties(id, props);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Properti node ID ${id} berhasil diperbarui di kanvas!\nDetail: ${JSON.stringify(res)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal memperbarui properti: ${msg}` }]
        };
      }
    }
  );

  // Tool 5: Batch Execution
  server.registerTool(
    'figcraft_batch',
    {
      description: 'Jalankan serangkaian perintah manipulasi desain FigCraft secara atomik dalam satu batch transaksi.',
      inputSchema: z.object({
        commands: z
          .array(
            z.object({
              command: z.string().describe('Nama perintah FigCraft (contoh: node.create, node.set)'),
              params: z.record(z.string(), z.any()).describe('Parameter perintah')
            })
          )
          .describe('Daftar perintah')
      })
    },
    async ({ commands }) => {
      try {
        const res = await client.batch(commands);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Batch ${commands.length} perintah berhasil dieksekusi di kanvas FigCraft!\nDetail: ${JSON.stringify(res)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal mengeksekusi batch: ${msg}` }]
        };
      }
    }
  );

  // Tool 6: Inspect Document
  server.registerTool(
    'figcraft_inspect_document',
    {
      description: 'Inspeksi hierarki kanvas dokumen aktif: halaman, layer, frame, styling, dan bounding box.',
      inputSchema: z.object({
        depth: z.number().optional().default(4).describe('Kedalaman inspeksi tree layer'),
        allPages: z.boolean().optional().default(false).describe('Periksa seluruh halaman')
      })
    },
    async ({ depth, allPages }) => {
      try {
        const doc = await client.inspectDocument(depth, allPages);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2)
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal menginspeksi dokumen kanvas: ${msg}` }]
        };
      }
    }
  );

  // Tool 7: Save File
  server.registerTool(
    'figcraft_save_file',
    {
      description: 'Simpan dokumen aktif di FigCraft ke disk (.figcraft).',
      inputSchema: z.object({
        path: z.string().optional().describe('Path berkas penyimpanan (opsional, default: path berkas saat dibuka)')
      })
    },
    async ({ path }) => {
      try {
        const res = await client.saveFile(path);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Dokumen aktif berhasil disimpan ke disk!\nDetail: ${JSON.stringify(res)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal menyimpan dokumen: ${msg}` }]
        };
      }
    }
  );

  // Tool 8: Screenshot / Export
  server.registerTool(
    'figcraft_screenshot',
    {
      description: 'Ambil snapshot visual kanvas aktif atau frame tertentu dalam format PNG.',
      inputSchema: z.object({
        ids: z.array(z.number()).optional().describe('ID frame spesifik untuk diekspor (opsional, default: seluruh halaman)'),
        scale: z.number().optional().default(1).describe('Skala resolusi render (default: 1)')
      })
    },
    async ({ ids, scale }) => {
      try {
        const res = await client.screenshot(ids, scale);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Snapshot kanvas berhasil direkam:\n${JSON.stringify(res)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal mengambil snapshot kanvas: ${msg}` }]
        };
      }
    }
  );

  // Tool 9: Ensure GUI Live Window
  server.registerTool(
    'figcraft_ensure_gui',
    {
      description: 'Pastikan FigCraft GUI berjalan aktif dengan jendela interaktif di monitor pengguna pada port kontrol 9099.',
      inputSchema: z.object({})
    },
    async () => {
      try {
        await client.ensureRunning();
        return {
          content: [
            {
              type: 'text',
              text: `✅ FigCraft GUI aktif dan mendengarkan pada port ${client.port}. Jendela kanvas live siap digunakan!`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ FigCraft GUI gagal diaktifkan: ${msg}` }]
        };
      }
    }
  );

  return server;
}
