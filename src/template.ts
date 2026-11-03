import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Creates a canonical FigCraft (.figcraft) project file if it doesn't exist.
 * The .figcraft format is a ZIP archive containing a structured document.json.
 */
export function createCanonicalFigCraftFile(filePath: string, projectName: string = 'New Project'): string {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(resolved)) {
    return resolved;
  }

  const docJson = {
    format: 'figcraft',
    version: 1,
    imageIndex: [],
    name: projectName,
    pages: [1],
    nodes: {
      '1': {
        id: 1,
        name: 'Page 1',
        type: 'page',
        background: { r: 0.11764706, g: 0.11764706, b: 0.11764706, a: 1.0 },
        flows: [],
        prototype: {
          device: 'None',
          background: { r: 0.11764706, g: 0.11764706, b: 0.11764706, a: 1.0 },
          rotation: 'portrait'
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

  const jsonStr = JSON.stringify(docJson, null, 2);
  const tempDir = path.join(path.dirname(resolved), `_figcraft_init_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const jsonPath = path.join(tempDir, 'document.json');
  fs.writeFileSync(jsonPath, jsonStr, 'utf8');

  const zipPath = path.join(tempDir, 'bundle.zip');

  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${jsonPath}' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'ignore' }
    );
  } else {
    execSync(`zip -j "${zipPath}" "${jsonPath}"`, { stdio: 'ignore' });
  }

  fs.copyFileSync(zipPath, resolved);
  fs.rmSync(tempDir, { recursive: true, force: true });

  return resolved;
}

