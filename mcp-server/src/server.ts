import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { fetchCatGallery } from "./catApi.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const CAT_WIDGET_TEMPLATE_URI = "ui://widget/cat-gallery.html";
const CAT_WIDGET_RELATIVE_PATH = "widget/cat-gallery.html";

const catWidgetMeta = {
  "openai/outputTemplate": CAT_WIDGET_TEMPLATE_URI,
  "openai/resultCanProduceWidget": true,
  "openai/widgetAccessible": true,
  "openai/toolInvocation/invoking": "Collecting cats…",
  "openai/toolInvocation/invoked": "Served the cat gallery"
} as const;

const toolInputSchema = {
  type: "object",
  properties: {
    limit: {
      type: "integer",
      description: "Number of cat photos to fetch (max 12).",
      minimum: 1,
      maximum: 12
    }
  },
  additionalProperties: false
} as const;

const toolInputParser = z
  .object({
    limit: z.number().int().min(1).max(12).optional()
  })
  .strict();

const catGalleryTool: Tool = {
  name: "show_cat_gallery",
  title: "Show cat gallery",
  description: "Fetch a curated list of cats from The Cat API to help the user take a break.",
  inputSchema: toolInputSchema,
  annotations: { readOnlyHint: true },
  _meta: catWidgetMeta
};

const resources: Resource[] = [
  {
    uri: CAT_WIDGET_TEMPLATE_URI,
    name: "Cat gallery widget",
    description: "React-based inline carousel for cat photos",
    mimeType: "text/html+skybridge",
    _meta: catWidgetMeta
  }
];

const resourceTemplates: ResourceTemplate[] = resources.map((resource) => ({
  uriTemplate: resource.uri,
  name: resource.name,
  description: resource.description,
  mimeType: resource.mimeType,
  _meta: resource._meta
}));

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};

async function readPublicFile(relativePath: string): Promise<Buffer> {
  const resolved = join(PUBLIC_DIR, relativePath);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    throw new Error("Invalid path");
  }

  return fs.readFile(resolved);
}

async function tryServeStatic(pathname: string, res: ServerResponse, method: string): Promise<boolean> {
  if (!pathname || pathname === "/") {
    return false;
  }

  const relativePath = pathname.startsWith("/") ? pathname.slice(1) : pathname;

  try {
    const data = await readPublicFile(relativePath);
    const contentType = mimeTypes[extname(relativePath)] ?? "application/octet-stream";
    res.writeHead(200, {
      "content-type": contentType,
      "Access-Control-Allow-Origin": "*"
    });
    if (method === "HEAD") {
      res.end();
    } else {
      res.end(data);
    }
    return true;
  } catch {
    return false;
  }
}

function createCatServer(): Server {
  const server = new Server(
    {
      name: "neko-mcp-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
    tools: [catGalleryTool]
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async (_request: ListResourcesRequest) => ({
    resources
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (_request: ListResourceTemplatesRequest) => ({
    resourceTemplates
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    if (request.params.uri !== CAT_WIDGET_TEMPLATE_URI) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }

    const html = await readPublicFile(CAT_WIDGET_RELATIVE_PATH);

    return {
      contents: [
        {
          uri: CAT_WIDGET_TEMPLATE_URI,
          mimeType: "text/html+skybridge",
          text: html.toString("utf-8"),
          _meta: catWidgetMeta
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    if (request.params.name !== catGalleryTool.name) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const parsed = toolInputParser.safeParse(request.params.arguments ?? {});

    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error.message}`);
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10_000);

    try {
      const limit = parsed.data.limit ?? 8;
      const photos = await fetchCatGallery(limit, abortController.signal);

      const textSummary =
        photos.length === 0
          ? "猫の写真を取得できませんでした。時間を置いて再試行してください。"
          : `${photos.length}匹の猫がギャラリーに参加しました。休憩のお供にどうぞ。`;

      return {
        content: [
          {
            type: "text",
            text: textSummary
          }
        ],
        structuredContent: {
          displayMode: "inlineCarousel",
          generatedAt: new Date().toISOString(),
          photos,
          message: textSummary,
          source: {
            type: "catapi",
            limit
          }
        },
        _meta: catWidgetMeta
      };
    } finally {
      clearTimeout(timeout);
    }
  });

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createCatServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && (url.pathname === ssePath || url.pathname === postPath)) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === ssePath) {
    await handleSseRequest(res);
    return;
  }

  if (req.method === "POST" && url.pathname === postPath) {
    await handlePostMessage(req, res, url);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health") {
    const body = JSON.stringify({ status: "ok" });
    res.writeHead(200, {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    if (req.method === "GET") {
      res.end(body);
    } else {
      res.end();
    }
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const served = await tryServeStatic(url.pathname, res, req.method);
    if (served) {
      return;
    }
  }

  res.writeHead(404).end("Not Found");
});

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Cat MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(`  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
  console.log(
    `  Widget HTML:        http://localhost:${port}/${CAT_WIDGET_RELATIVE_PATH}`
  );
  console.log(`  Widget assets path: http://localhost:${port}/assets/...`);
});
