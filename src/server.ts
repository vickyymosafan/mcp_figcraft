import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FigCraftClient } from './client.js';

export function createFigCraftServer(client: FigCraftClient = new FigCraftClient()): McpServer {
  const server = new McpServer({
    name: 'figcraft-mcp-server',
    version: '1.2.0'
  });

  const registerWithAliases = (
    names: string[],
    config: { description: string; inputSchema: z.ZodObject<any> },
    handler: (args: any) => Promise<any>
  ) => {
    for (const name of names) {
      server.registerTool(name, config, handler);
    }
  };

  // Tool 1: Core 1-by-1 Flow: Create file with name and immediately auto-open in FigCraft GUI
  registerWithAliases(
    ['figcraft_create_and_open', 'create_and_open'],
    {
      description:
        'Langkah 1 & 2 Kanonik: Buat berkas kanvas (.figcraft) beserta namanya di disk, lalu otomatis LANGSUNG buka berkas tersebut di jendela aktif FigCraft GUI di monitor pengguna tanpa perlu user buka manual.',
      inputSchema: z.object({
        filePath: z.string().describe('Path file kanvas tujuan (contoh: designs/storefront.figcraft)'),
        projectName: z.string().optional().describe('Nama proyek desain (contoh: Aura 3D Commerce)')
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

  // Tool 2: Responsive System Generator (Desktop 1440, Tablet 768, Mobile 375)
  registerWithAliases(
    ['figcraft_create_responsive_system', 'create_responsive_system'],
    {
      description:
        'Buat sistem 3 Artboard Responsif tersinkronisasi berdampingan di kanvas (Desktop 1440px, Tablet 768px, Mobile 375px) dengan Auto-Layout root frame vertikal dan tema warna konsisten. Terintegrasi penuh dengan Harness MCP responsive verification.',
      inputSchema: z.object({
        projectName: z.string().optional().describe('Nama proyek/halaman (contoh: Storefront Landing Page)'),
        theme: z.enum(['dark', 'light']).optional().default('dark').describe('Tema visual kanvas: dark atau light')
      })
    },
    async ({ projectName, theme }) => {
      try {
        const res = await client.createResponsiveSystem({ projectName, theme });
        return {
          content: [
            {
              type: 'text',
              text: `✅ [Sistem Responsif Berhasil Dibuat di Kanvas FigCraft]:\n` +
                `- 🖥️ Desktop Frame (1440x1024): ID ${res.desktop.id} (x: ${res.desktop.x})\n` +
                `- 📱 Tablet Frame (768x1024): ID ${res.tablet.id} (x: ${res.tablet.x})\n` +
                `- 📲 Mobile Frame (375x812): ID ${res.mobile.id} (x: ${res.mobile.x})\n\n` +
                `Semua artboard telah dikonfigurasi dengan Auto-Layout vertikal siap diisi komponen atomik.`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal membuat sistem responsif: ${msg}` }]
        };
      }
    }
  );

  // Tool 3: Auto-Layout Frame (Figma Flexbox Container)
  registerWithAliases(
    ['figcraft_create_autolayout_frame', 'create_autolayout_frame'],
    {
      description:
        'Buat kontainer Auto-Layout (Figma-grade Flexbox) dengan arah vertikal/horizontal, padding, gap, alignment, dan sizing (hug/fill/fixed) sehingga elemen tidak berantakan atau bertumpuk.',
      inputSchema: z.object({
        name: z.string().describe('Nama kontainer frame (contoh: Navbar, Hero Stack, Card Grid)'),
        parent: z.number().optional().describe('ID parent frame (default: halaman aktif)'),
        direction: z.enum(['vertical', 'horizontal']).optional().default('vertical').describe('Arah Auto-Layout'),
        width: z.number().optional().describe('Lebar frame jika sizingH fixed'),
        height: z.number().optional().describe('Tinggi frame jika sizingV fixed'),
        x: z.number().optional().describe('Posisi X (hanya untuk artboard root)'),
        y: z.number().optional().describe('Posisi Y (hanya untuk artboard root)'),
        padding: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional().describe('Padding pixel: angka atau [T, R, B, L]'),
        gap: z.number().optional().default(16).describe('Jarak antar elemen anak dalam pixel'),
        mainAlign: z.enum(['min', 'center', 'max', 'spaceBetween', 'start', 'end']).optional().default('min').describe('Alignment sumbu utama (flex-direction)'),
        crossAlign: z.enum(['min', 'center', 'max', 'baseline', 'start', 'end']).optional().default('min').describe('Alignment sumbu silang (cross-axis)'),
        sizingH: z.enum(['fixed', 'hug', 'fill']).optional().default('fill').describe('Perilaku ukuran horizontal'),
        sizingV: z.enum(['fixed', 'hug', 'fill']).optional().default('hug').describe('Perilaku ukuran vertikal'),
        bgColor: z.string().optional().describe('Warna latar solid hex (contoh: #1E293B)'),
        borderColor: z.string().optional().describe('Warna border hex (contoh: #374151)'),
        borderWidth: z.number().optional().describe('Ketebalan border pixel'),
        cornerRadius: z.number().optional().describe('Radius sudut kelengkungan (border-radius)')
      })
    },
    async (params) => {
      try {
        const res = await client.createAutoLayoutFrame(params as any);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Kontainer Auto-Layout "${params.name}" (${params.direction}) berhasil dibuat! (ID: ${res.id})`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal membuat kontainer Auto-Layout: ${msg}` }]
        };
      }
    }
  );

  // Tool 4: High-Level UI Component Generator
  registerWithAliases(
    ['figcraft_create_component', 'create_component'],
    {
      description:
        'Hasilkan komponen UI terstruktur siap pakai tanpa layer berantakan: "navbar" (logo + links + cta), "hero" (badge + multiline display + subtitle + cta buttons), atau "card" (media placeholder + tag + title + body + price/cta).',
      inputSchema: z.object({
        type: z.enum(['navbar', 'hero', 'card']).describe('Tipe komponen yang dibuat'),
        parent: z.number().describe('ID frame kontainer tempat komponen diletakkan'),
        options: z.record(z.string(), z.any()).describe('Opsi komponen (title, subtitle, badge, brandName, links, price, ctaText, dll)')
      })
    },
    async ({ type, parent, options }) => {
      try {
        const mergedOpts = { ...options, parent };
        const res = await client.createComponent(type, mergedOpts);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Komponen atomik "${type}" berhasil di-render di kanvas! (Root ID: ${res.id})`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal menghasilkan komponen ${type}: ${msg}` }]
        };
      }
    }
  );

  // Tool 5: Layout & Quality Audit (Harness Bridge)
  registerWithAliases(
    ['figcraft_audit_layout', 'audit_layout'],
    {
      description:
        'Audit kualitas layout kanvas secara otomatis untuk mendeteksi layer berantakan (flat layers tanpa Auto-Layout), teks dengan karakter \\n escaped mentah, serta kelengkapan artboard responsif. Menghasilkan skor kualitas dan payload bukti untuk Harness MCP quality checkpoints.',
      inputSchema: z.object({})
    },
    async () => {
      try {
        const audit = await client.auditLayout();
        return {
          content: [
            {
              type: 'text',
              text: `📊 [Laporan Kualitas Desain Kanvas FigCraft]:\n` +
                `- Skor Kualitas: ${audit.score}/100 (${audit.passed ? '✅ LOLOS' : '⚠️ BUTUH PERBAIKAN'})\n` +
                `- Total Node: ${audit.totalNodes}\n` +
                `- Kontainer Auto-Layout: ${audit.autoLayoutFrameCount}\n` +
                `- Layer Primitif Tak Terbungkus (Spaghetti): ${audit.flatRootChildrenCount}\n` +
                `- Cakupan Responsif: Desktop=${audit.responsiveArtboards.desktopFound ? '✅' : '❌'}, Tablet=${audit.responsiveArtboards.tabletFound ? '✅' : '❌'}, Mobile=${audit.responsiveArtboards.mobileFound ? '✅' : '❌'}\n\n` +
                `📋 Pelanggaran Terdeteksi (${audit.violations.length}):\n` +
                (audit.violations.length === 0
                  ? 'Tidak ada pelanggaran! Layout bersih, terstruktur, dan responsif.\n'
                  : audit.violations.map((v, i) => `${i + 1}. [${v.severity.toUpperCase()}] ${v.message}\n   💡 Saran: ${v.recommendation}`).join('\n')) +
                `\n\n🛡️ [Bukti Kesiapan Harness MCP]:\n${JSON.stringify(audit.harnessEvidence, null, 2)}`
            }
          ]
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `❌ Gagal mengaudit layout kanvas: ${msg}` }]
        };
      }
    }
  );

  // Tool 6: Create Node (Live Canvas Generation)
  registerWithAliases(
    ['figcraft_create_node', 'create_node'],
    {
      description:
        'Langkah 3 Kanonik: Gambar elemen visual (frame, rectangle, text, ellipse, button, dll) secara LIVE langsung di kanvas yang sedang terbuka dengan pembersihan otomatis karakter \\n.',
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
        text: z.string().optional().describe('Isi teks (jika type = text, otomatis disanitasi dari literal \\n)'),
        props: z.record(z.string(), z.any()).optional().describe('Properti visual: fills, strokes, cornerRadius, fontSize, fontFamily, fontWeight, layout, gap, padding, dll.')
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

  // Tool 7: Set Properties
  registerWithAliases(
    ['figcraft_set_properties', 'set_properties'],
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

  // Tool 8: Batch Execution
  registerWithAliases(
    ['figcraft_batch', 'batch'],
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

  // Tool 9: Inspect Document
  registerWithAliases(
    ['figcraft_inspect_document', 'inspect_document'],
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

  // Tool 10: Save File
  registerWithAliases(
    ['figcraft_save_file', 'save_file'],
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

  // Tool 11: Screenshot / Export
  registerWithAliases(
    ['figcraft_screenshot', 'screenshot'],
    {
      description: 'Ambil snapshot visual kanvas aktif atau frame tertentu dalam format PNG untuk bukti Harness quality gate.',
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

  // Tool 12: Ensure GUI Live Window
  registerWithAliases(
    ['figcraft_ensure_gui', 'ensure_gui'],
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

  // Tool 13: Open File
  registerWithAliases(
    ['figcraft_open_file', 'open_file'],
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

  return server;
}
