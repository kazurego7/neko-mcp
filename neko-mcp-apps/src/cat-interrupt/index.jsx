import React from "react";
import { createRoot } from "react-dom/client";

const SAMPLE_SCENARIO = {
  topic: "アジャイル",
  title: "横切りで説明を遮る",
  eventType: "cross",
  tone: "gentle",
  description:
    "AIが「アジャイル」について真面目に説明しているところへ猫が横切り、説明が一瞬止まって言い直しになるシーンです。",
  beats: [
    {
      stage: "setup",
      actor: "ai",
      text: "「アジャイル」について順番にご紹介しますね――"
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
  },
  notes: [
    "AIメッセージの途中に猫イベントを差し込めば、Apps SDK上でも演出が自然に見えます。",
    "ASCIIアートは必須ではありません。スタンプやGIFで代替しても成立します。"
  ]
};

const STAGE_LABELS = {
  setup: "導入",
  interruption: "乱入",
  recovery: "立て直し"
};

const ACTOR_LABELS = {
  ai: "AI",
  cat: "猫"
};

function CatScenarioView({ scenario }) {
  return (
    <div className="scenario">
      <header className="scenario__header">
        <div>
          <div className="scenario__tag">Cat Mischief Scenario</div>
          <h1 className="scenario__title">{scenario.title}</h1>
        </div>
        <dl className="scenario__meta">
          <div>
            <dt>トピック</dt>
            <dd>{scenario.topic}</dd>
          </div>
          <div>
            <dt>イベント</dt>
            <dd>{labelEventType(scenario.eventType)}</dd>
          </div>
          <div>
            <dt>ムード</dt>
            <dd>{labelTone(scenario.tone)}</dd>
          </div>
        </dl>
      </header>

      <p className="scenario__description">{scenario.description}</p>

      <section className="scenario__visual">
        <figure>
          <img
            src={scenario.suggestedImage.url}
            alt={scenario.suggestedImage.alt}
            loading="lazy"
          />
          <figcaption>{scenario.suggestedImage.alt}</figcaption>
        </figure>
        <pre aria-label="猫の乱入イメージ" className="scenario__ascii">
          {scenario.ascii}
        </pre>
      </section>

      <section className="scenario__beats">
        <h2>シナリオ進行</h2>
        <ol>
          {scenario.beats.map((beat, index) => (
            <li key={`${beat.stage}-${index}`}>
              <header>
                <span className={`scenario__stage scenario__stage--${beat.stage}`}>
                  {STAGE_LABELS[beat.stage] ?? beat.stage}
                </span>
                <span className={`scenario__actor scenario__actor--${beat.actor}`}>
                  {ACTOR_LABELS[beat.actor] ?? beat.actor}
                </span>
              </header>
              <p>{beat.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="scenario__notes">
        <h2>使い方のヒント</h2>
        <ul>
          {scenario.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function labelEventType(eventType) {
  switch (eventType) {
    case "cross":
      return "横切り";
    case "punch":
      return "猫パンチ";
    case "sit":
      return "居座り";
    default:
      return eventType;
  }
}

function labelTone(tone) {
  switch (tone) {
    case "gentle":
      return "おだやか";
    case "chaotic":
      return "ドタバタ";
    case "clingy":
      return "甘えん坊";
    default:
      return tone;
  }
}

function App() {
  const [scenario] = React.useState(() => {
    const payload = window.__CAT_SCENARIO__;
    if (payload && typeof payload === "object") {
      return payload;
    }
    return SAMPLE_SCENARIO;
  });

  return (
    <div className="app-shell">
      <CatScenarioView scenario={scenario} />
    </div>
  );
}

createRoot(document.getElementById("cat-interrupt-root")).render(<App />);
