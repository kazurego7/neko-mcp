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
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
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
      `Widget assets for "${name}" were not found at ${snippetPath}. ` +
        `Run "pnpm build" inside the neko-mcp-apps workspace to generate assets.`
    );
  }
  return fs.readFileSync(snippetPath, "utf8").trim();
}

const widgets: CatWidget[] = [
  {
    id: "cat-carousel",
    title: "Show Cat Carousel",
    templateUri: "ui://widget/cat-carousel.html",
    invoking: "Summoning feline friends",
    invoked: "Cat carousel is live",
    html: loadWidgetMarkup("cat-carousel"),
    responseText: "Rendered a cat carousel!"
  }
];

const widgetsById = new Map<string, CatWidget>();
const widgetsByUri = new Map<string, CatWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

type CatScenarioTemplate = {
  id: string;
  title: string;
  eventType: "cross" | "punch" | "sit";
  tone: "gentle" | "chaotic" | "clingy";
  description(topic: string): string;
  beats(topic: string): Array<{
    stage: "setup" | "interruption" | "recovery";
    actor: "ai" | "cat";
    text: string;
  }>;
  ascii: string;
  suggestedImage: {
    url: string;
    alt: string;
  };
};

const catScenarioTemplates: CatScenarioTemplate[] = [
  {
    id: "cross-and-restart",
    title: "横切りで説明を遮る",
    eventType: "cross",
    tone: "gentle",
    description: (topic) =>
      `AIが「${topic}」について真面目に説明しているところへ猫が横切り、説明が一瞬止まって言い直しになるシーンです。`,
    beats: (topic) => [
      {
        stage: "setup",
        actor: "ai",
        text: `「${topic}」について順番にご紹介しますね――`
      },
      {
        stage: "interruption",
        actor: "cat",
        text: "すっと画面を横切り、鳴き声を残して去っていく。『にゃっ！』"
      },
      {
        stage: "recovery",
        actor: "ai",
        text: "……い、いま見えましたか？ ええと、説明をもう一度整えますね。"
      }
    ],
    ascii: ` ／＞　 フ
 | 　_　_|
／\` ミ＿xノ   ﾄｺﾄｺ…
/　　　　 |
/　 ヽ＿ヽ _)_)`,
    suggestedImage: {
      url: "https://placekitten.com/480/270",
      alt: "横切りざまにこちらを見る黒猫"
    }
  },
  {
    id: "under-text-punch",
    title: "テキスト下から猫パンチ連打",
    eventType: "punch",
    tone: "chaotic",
    description: (topic) =>
      `AIが「${topic}」の要点を列挙している最中、表示テキストの下から猫パンチが飛び出して説明が中断されるシーンです。`,
    beats: (topic) => [
      {
        stage: "setup",
        actor: "ai",
        text: `続いて「${topic}」で押さえておきたいポイントは──`
      },
      {
        stage: "interruption",
        actor: "cat",
        text: "説明テキストの下端から肉球が飛び出す。『(=^･ｪ･^=)ﾉｼ ﾊﾟｼｯ!』"
      },
      {
        stage: "recovery",
        actor: "ai",
        text: "いたっ、ちょっと待ってください、今重要なところなので……それでは改めて。"
      }
    ],
    ascii: `──────────────
説明テキスト領域
──────────────
   (=^･ｪ･^=)ﾉｼ ﾊﾟｼｯ!
        ↑
   猫パンチゾーン`,
    suggestedImage: {
      url: "https://placekitten.com/500/280",
      alt: "画面の端から前足を伸ばす猫"
    }
  },
  {
    id: "sit-and-stare",
    title: "見出しの上に居座る",
    eventType: "sit",
    tone: "clingy",
    description: (topic) =>
      `「${topic}」の章を見せようとした瞬間に、猫が見出しの上へ座り込んで視界を塞ぐシーンです。`,
    beats: (topic) => [
      {
        stage: "setup",
        actor: "ai",
        text: `最後に「${topic}」でよく使われる手法をご紹介します。`
      },
      {
        stage: "interruption",
        actor: "cat",
        text: "見出しの真上にちょこんと座り、こちらをじっと見つめる。『……ﾆｬ』"
      },
      {
        stage: "recovery",
        actor: "ai",
        text: "そこに座られると文字が読めないんですが……少しだけ譲ってもらえますか？"
      }
    ],
    ascii: `　 ∧＿∧　
　( ΦωΦ )   ←ここに居座る
　( つ旦O
　と＿)_)`,
    suggestedImage: {
      url: "https://placekitten.com/460/280",
      alt: "パソコンの前で居座る猫"
    }
  }
];

const catCarouselInputSchema = {
  type: "object",
  properties: {
    catKeyword: {
      type: "string",
      description: "Keyword or short note about the cats to include in the completion."
    }
  },
  required: ["catKeyword"],
  additionalProperties: false
} as const;

const catCarouselInputParser = z.object({
  catKeyword: z.string().min(1).max(60)
});

const catScenarioInputSchema = {
  type: "object",
  properties: {
    topic: {
      type: "string",
      description: "説明が邪魔される内容やテーマ。例: アジャイル、家計簿アプリの使い方など。"
    },
    tone: {
      type: "string",
      enum: ["gentle", "chaotic", "clingy"],
      description: "猫の乱入の雰囲気。柔らかめ(gentle)、ドタバタ(chaotic)、甘えん坊(clingy)。"
    }
  },
  required: ["topic"],
  additionalProperties: false
} as const;

const catScenarioInputParser = z.object({
  topic: z.string().min(1).max(120),
  tone: z.enum(["gentle", "chaotic", "clingy"]).optional()
});

type CatScenario = {
  topic: string;
  title: string;
  eventType: CatScenarioTemplate["eventType"];
  tone: CatScenarioTemplate["tone"];
  description: string;
  beats: ReturnType<CatScenarioTemplate["beats"]>;
  ascii: string;
  suggestedImage: CatScenarioTemplate["suggestedImage"];
  notes: string[];
};

function pickScenarioTemplate(tone?: CatScenario["tone"]): CatScenarioTemplate {
  const pool =
    tone !== undefined
      ? catScenarioTemplates.filter((template) => template.tone === tone)
      : catScenarioTemplates;
  if (pool.length === 0) {
    return catScenarioTemplates[0];
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? catScenarioTemplates[0];
}

function createCatScenario(topic: string, tone?: CatScenario["tone"]): CatScenario {
  const template = pickScenarioTemplate(tone);
  const beats = template.beats(topic);

  const notes: string[] = [
    "このシナリオはUIではなくテキストベースでの演出を想定しています。",
    "AIメッセージの途中に猫イベントを差し込み、再開時のセリフを用意するとスムーズです。"
  ];

  return {
    topic,
    title: template.title,
    eventType: template.eventType,
    tone: template.tone,
    description: template.description(topic),
    beats,
    ascii: template.ascii,
    suggestedImage: template.suggestedImage,
    notes
  };
}

const widgetTools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description: widget.title,
  inputSchema: catCarouselInputSchema,
  title: widget.title,
  _meta: widgetMeta(widget)
}));

const catScenarioTool: Tool = {
  name: "cat-interrupt",
  title: "Generate Cat Mischief Scenario",
  description:
    "指定したトピックの説明が猫に邪魔されるミニシナリオと、参考画像URL・スクリプト例を生成します。",
  inputSchema: catScenarioInputSchema
};

const tools: Tool[] = [...widgetTools, catScenarioTool];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget)
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
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
    if (request.params.name === catScenarioTool.name) {
      const args = catScenarioInputParser.parse(request.params.arguments ?? {});
      const scenario = createCatScenario(args.topic, args.tone);

      const summary = [
        `猫乱入シーン: ${scenario.title}`,
        `状況: ${scenario.description}`,
        `推奨画像URL: ${scenario.suggestedImage.url}`
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: summary
          }
        ],
        structuredContent: {
          catScenario: {
            topic: scenario.topic,
            title: scenario.title,
            eventType: scenario.eventType,
            tone: scenario.tone,
            description: scenario.description,
            beats: scenario.beats,
            ascii: scenario.ascii,
            suggestedImage: scenario.suggestedImage,
            notes: scenario.notes
          }
        }
      };
    }

    const widget = widgetsById.get(request.params.name);

    if (!widget) {
      throw new Error(`Unknown tool: ${request.params.name}`);
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

  res.writeHead(404).end("Not Found");
});

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Neko MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(`  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
});
