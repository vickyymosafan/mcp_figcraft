import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFigCraftServer } from './server.js';
import { FigCraftClient, DEFAULT_CONTROL_PORT } from './client.js';

export * from './client.js';
export * from './server.js';
export * from './template.js';
export * from './types.js';

export async function runServer(): Promise<void> {
  const port = process.env.FIGCRAFT_CONTROL_PORT
    ? parseInt(process.env.FIGCRAFT_CONTROL_PORT, 10)
    : DEFAULT_CONTROL_PORT;

  const client = new FigCraftClient(port);
  const server = createFigCraftServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error(`[figcraft-mcp] Server berjalan pada stdio, terhubung ke FigCraft port ${port}.`);
}

if (process.env.NODE_ENV !== 'test' && !process.env.FIGCRAFT_MCP_NO_AUTO_START) {
  runServer().catch((err) => {
    console.error('[figcraft-mcp fatal error]:', err);
    process.exit(1);
  });
}
