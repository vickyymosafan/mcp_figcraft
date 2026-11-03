import * as fs from 'node:fs';
import * as path from 'node:path';
import { createFigCraftServer } from '../dist/server.js';

async function main() {
  const targetDir = 'C:\\Users\\vickymosafan\\.gemini\\antigravity\\mcp\\figcraft';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const server = createFigCraftServer();
  const handler = (server.server as any)._requestHandlers.get('tools/list');
  const res = await handler({ method: 'tools/list', params: {} }, {});

  console.log(`Menyinkronkan ${res.tools.length} alat ke ${targetDir}...`);

  for (const tool of res.tools) {
    const filePath = path.join(targetDir, `${tool.name}.json`);
    const schema = {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema || null
    };
    fs.writeFileSync(filePath, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`Saved: ${tool.name}.json`);
  }

  // Generate instructions.md
  const instructionsPath = path.join(targetDir, 'instructions.md');
  const instructionsContent = `# FigCraft MCP Server (figcraft-mcp v1.2.0)

FigCraft Live MCP integration for AI coding assistants with Figma-grade Auto-Layout, Responsive Artboard Systems, and Harness MCP Quality Gates.

## Alur Utama Desain UI/UX (Automated 1-by-1 Pipeline):
1. **figcraft_create_and_open**: Buat berkas kanvas (.figcraft) dengan nama proyek dan otomatis langsung dibuka di jendela aktif FigCraft GUI.
2. **figcraft_create_responsive_system**: Buat 3 artboard responsif sinkron berdampingan (Desktop 1440, Tablet 768, Mobile 375) dengan Auto-Layout root.
3. **figcraft_create_autolayout_frame**: Buat kontainer Flexbox Auto-Layout (vertical/horizontal, gap, padding, mainAlign, crossAlign, sizingH, sizingV).
4. **figcraft_create_component**: Buat komponen atomik tingkat tinggi ("navbar", "hero", "card") tanpa spaghetti layer.
5. **figcraft_create_node**: Buat elemen kanvas (frame, rectangle, text, ellipse, button) dengan sanitasi teks otomatis (menghilangkan literal "\\n").
6. **figcraft_set_properties**: Perbarui visual styling, corner radius, warna, dan auto-layout.
7. **figcraft_audit_layout**: Audit otomatis hierarki kanvas untuk mendeteksi layer berantakan dan menghasilkan bukti Harness MCP.
8. **figcraft_screenshot**: Ambil snapshot visual resolusi tinggi kanvas untuk bukti evaluasi checkpoint.
9. **figcraft_save_file**: Simpan kanvas ke disk (.figcraft).
`;
  fs.writeFileSync(instructionsPath, instructionsContent, 'utf8');
  console.log('Saved: instructions.md');
}

main().catch(console.error);
