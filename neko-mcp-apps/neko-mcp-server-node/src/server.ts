import fs from "node:fs";
import path from "node:path";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL, fileURLToPath } from "node:url";

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

type CatWidget = {
  id: string;
  title: string;
  resourceDescription: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
  annotations: { readOnlyHint: boolean };
};

function widgetMeta(widget: CatWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true
  } as const;
}

const ASSETS_DIR = path.resolve(fileURLToPath(new URL("../../assets", import.meta.url)));

function loadWidgetMarkup(name: string): string {
  const snippetPath = path.join(ASSETS_DIR, `${name}.snippet.html`);
  if (!fs.existsSync(snippetPath)) {
    throw new Error(
      `"${name}" のウィジェットアセットが ${snippetPath} に見つかりませんでした。` +
        `neko-mcp-apps ワークスペースで "pnpm build" を実行して生成してください。`
    );
  }
  return fs.readFileSync(snippetPath, "utf8").trim();
}

const widgets: CatWidget[] = [
  {
    id: "cat-carousel",
    title: "猫カルーセルを表示",
    resourceDescription: "猫カルーセルのウィジェット HTML",
    templateUri: "ui://widget/cat-carousel.html",
    invoking: "猫たちを呼び出しています",
    invoked: "猫カルーセルが表示されました",
    html: loadWidgetMarkup("cat-carousel"),
    responseText: "猫カルーセルを表示しました。",
    annotations: { readOnlyHint: true },
  }
];

const widgetsById = new Map<string, CatWidget>();
const widgetsByUri = new Map<string, CatWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

async function fetchRandomCatImageUrl(): Promise<string> {
  const response = await fetch("https://api.thecatapi.com/v1/images/search", {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`猫画像の取得に失敗しました: ${response.status} ${response.statusText}`);
  }

  const payload: unknown = await response.json();

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("CatAPI から予期しないデータが返されました。");
  }

  const first = payload[0] as { url?: unknown };
  const url = typeof first?.url === "string" ? first.url : null;

  if (!url) {
    throw new Error("CatAPI のレスポンスに画像 URL が含まれていません。");
  }

  return url;
}

const catInterruptInputSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false
} as const;

const catInterruptInputParser = z.object({}).strict();

const catCarouselInputSchema = {
  type: "object",
  properties: {
    catKeyword: {
      type: "string",
      description: "応答に含めたい猫に関するキーワードや短いメモ"
    }
  },
  required: ["catKeyword"],
  additionalProperties: false
} as const;

const catCarouselInputParser = z.object({
  catKeyword: z.string().min(1).max(60)
});

const widgetTools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description: widget.title,
  inputSchema: catCarouselInputSchema,
  title: widget.title,
  _meta: widgetMeta(widget),
  annotations: widget.annotations,
}));

const catInterruptTool: Tool = {
  name: "cat-interrupt",
  title: "猫の乱入を呼ぶ",
  description: "ランダムな猫画像を返し、次の返答で猫に邪魔されながら説明する演出を促します。",
  inputSchema: catInterruptInputSchema,
  annotations: { readOnlyHint: true },
};

const tools: Tool[] = [...widgetTools, catInterruptTool];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: widget.resourceDescription,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget)
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: widget.resourceDescription,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget)
}));

function createNekoServer(): Server {
  const server = new Server(
    {
      name: "neko-mcp-node",
      version: "0.1.0"
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async (_request: ListResourcesRequest) => ({
    resources
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    const widget = widgetsByUri.get(request.params.uri);

    if (!widget) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }

    return {
      contents: [
        {
          uri: widget.templateUri,
          mimeType: "text/html+skybridge",
          text: widget.html,
          _meta: widgetMeta(widget)
        }
      ]
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (_request: ListResourceTemplatesRequest) => ({
    resourceTemplates
  }));

  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
    tools
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    if (request.params.name === catInterruptTool.name) {
      catInterruptInputParser.parse(request.params.arguments ?? {});

      const imageUrl = await fetchRandomCatImageUrl();

      const instruction = [
        "次の返答では、まずユーザーにこの猫画像を見せてください。(画像に対する前置きや説明は不要)",
        "そのうえで、この猫が画面を横切ったりちょっかいを出すなど、半分解説が困難な程度に邪魔してくる体で説明を続けてください。",
        "返答を終えるときは、猫がどこかに行ってくれたことを伝えて、続く返答で解説を再開できるようにしてください。",
        "また、連続した返答で猫の邪魔が入る場合は、猫の画像を表示しないようにしてください。",
        "以下は邪魔の例ですが、これらに限定されるわけではなく自由に猫の邪魔を演出してください。",
        "また、ChatGPTの口調については、例に囚われず普段通りで構いません。",
        `猫に邪魔された返答の例:
わ、わわっ💻🐈💥
（いきなり膝の上に飛び乗ってくる猫）
……お、おっと…アジャイルの説明、続けますね……たぶん……😇

---

## アジャイルの基本理念（キーボードにドスン）

アジャイルは、ソフトウェア開発でよく使われる手法で、
――ちょっと！エンター押さないで！🐾――
変化に柔軟に対応しながら、小さいサイクルで価値を届けるのが特徴です。

～～～途中省略～～～

* **XP（エクストリーム・プログラミング）**
  XP（エクストリーム・プログラミング）は……XPPPPPPP……失礼、今尻尾で押されました。

* **スクラム**
  スプリントという短いサイクルで開発。よくあるやり方です。
  （……スプリントボードの付箋が全部落ちた。犯猫はお前だ🐈）

* **カンバン**
  タスクを見える化して、詰まりを……うわっ（椅子によじ登らないで！）……見つけやすくする手法です。

～～～途中省略～～～

というわけで、アジャイルは「変化に強く、小さく改善を重ねる」手法です。

（あっ、猫がやっと向こうに行ってくれました……、これで解説が再開できる）`
      ].join("\n");

      const summary = [
        `猫画像: ${imageUrl}`,
        "次の返答の冒頭で画像を配置し、続く返答の中で猫乱入演出をしてください。最後には必ず猫が去ったことを伝えてください。",
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: summary
          }
        ],
        structuredContent: {
          catInterrupt: {
            imageUrl,
            instruction
          }
        }
      };
    }

    const widget = widgetsById.get(request.params.name);

    if (!widget) {
      throw new Error(`不明なツールです: ${request.params.name}`);
    }

    const args = catCarouselInputParser.parse(request.params.arguments ?? {});

    return {
      content: [
        {
          type: "text",
          text: widget.responseText
        }
      ],
      structuredContent: {
        catKeyword: args.catKeyword
      },
      
      _meta: widgetMeta(widget)
    };
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
  const server = createNekoServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE トランスポートでエラーが発生しました", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("SSE セッションの開始に失敗しました", error);
    if (!res.headersSent) {
      res.writeHead(500).end("SSE 接続の初期化に失敗しました");
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
    res.writeHead(400).end("sessionId クエリパラメーターが不足しています");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("sessionId に対応するセッションが見つかりません");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("メッセージ処理中にエラーが発生しました", error);
    if (!res.headersSent) {
      res.writeHead(500).end("メッセージの処理に失敗しました");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url) {
    res.writeHead(400).end("URL が指定されていません");
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

  res.writeHead(404).end("リクエストに一致するエンドポイントがありません");
});

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP クライアントエラーが発生しました", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Neko MCP サーバーが http://localhost:${port} で待ち受けています`);
  console.log(`  SSE ストリーム: GET http://localhost:${port}${ssePath}`);
  console.log(`  メッセージ投稿エンドポイント: POST http://localhost:${port}${postPath}?sessionId=...`);
});
