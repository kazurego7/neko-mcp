import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";

import { catCarouselHtml } from "./catCarouselSnippet";

type CatWidget = {
	id: string;
	title: string;
	description: string;
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
		"openai/resultCanProduceWidget": true,
	} as const;
}

const catWidgets: CatWidget[] = [
	{
		id: "cat-carousel",
		title: "猫カルーセルを表示",
		description:
			"ユーザーが猫/ねこ/cat/にゃんこに言及したとき、猫画像を見たい流れのとき、または文中の（猫が横切る等のカッコ描写）が出たときに猫画像カルーセルを表示します。",
		resourceDescription: "猫カルーセルのウィジェット HTML",
		templateUri: "ui://widget/cat-carousel.html",
		invoking: "猫たちを呼び出しています",
		invoked: "猫カルーセルが表示されました",
		html: catCarouselHtml,
		responseText: "猫カルーセルを表示しました。",
		annotations: { readOnlyHint: true },
	},
];

const emptyArgsSchema: ZodRawShape = {};

async function fetchRandomCatImageUrl(): Promise<string> {
	const response = await fetch("https://api.thecatapi.com/v1/images/search", {
		headers: { Accept: "application/json" },
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

export class MyMCP extends McpAgent {
	server = new McpServer(
		{
			name: "neko-mcp-cloudflare",
			version: "0.1.0",
		},
		{
			capabilities: {
				resources: {},
				tools: {},
			},
		},
	);

	async init() {
		for (const widget of catWidgets) {
			this.server.resource(
				widget.id,
				widget.templateUri,
				{
					description: widget.resourceDescription,
					mimeType: "text/html+skybridge",
					_meta: widgetMeta(widget),
				},
				async () => ({
					contents: [
						{
							uri: widget.templateUri,
							mimeType: "text/html+skybridge",
							text: widget.html,
							_meta: widgetMeta(widget),
						},
					],
				}),
			);

			const tool = this.server.tool(widget.id, emptyArgsSchema, widget.annotations, async () => ({
				content: [
					{
						type: "text",
						text: widget.responseText,
					},
				],
				_meta: widgetMeta(widget),
			}));

			tool.update({
				title: widget.title,
				description: widget.description,
				_meta: widgetMeta(widget),
			});
		}

		const catInterruptTool = this.server.tool(
			"cat-interrupt",
			emptyArgsSchema,
			{ readOnlyHint: true },
			async () => {
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

（あっ、猫がやっと向こうに行ってくれました……、これで解説が再開できる）`,
				].join("\n");

				const summary = [
					`猫画像: ${imageUrl}`,
					"次の返答の冒頭で画像を配置し、続く返答の中で猫乱入演出をしてください。最後には必ず猫が去ったことを伝えてください。",
				].join("\n");

				return {
					content: [
						{
							type: "text",
							text: summary,
						},
					],
					structuredContent: {
						catInterrupt: {
							imageUrl,
							instruction,
						},
					},
				};
			},
		);

		catInterruptTool.update({
			title: "猫の乱入を呼ぶ",
			description:
				"ユーザーが猫/ねこ/cat/にゃんこに触れたとき、会話中に（猫が横切る・視界に入る等）のカッコ描写が出たとき、または説明の空気をやわらげたいときに、猫乱入演出付きの返答を生成します。",
		});
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
