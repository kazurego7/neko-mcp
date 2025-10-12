import { useEffect, useMemo } from "react";
import CatGalleryCarousel from "../components/CatGalleryCarousel";
import type { CatPhoto } from "../api/catApi";
import { useWidgetProps } from "../use-widget-props";
import { useOpenAiGlobal } from "../use-openai-global";

export type CatGalleryToolOutput = {
  photos?: CatPhoto[];
  generatedAt?: string;
  message?: string;
};

const FALLBACK_MESSAGE = "猫の画像を取得できませんでした。時間を置いて再度お試しください。";

export default function CatGalleryWidget() {
  const toolOutput = useWidgetProps<CatGalleryToolOutput>({ photos: [] });
  const photos = toolOutput?.photos ?? [];
  const requestDisplayMode = useOpenAiGlobal("requestDisplayMode");

  useEffect(() => {
    if (!requestDisplayMode) {
      return;
    }

    requestDisplayMode({ mode: "inline" }).catch(() => {
      // ignore; host may reject the request
    });
  }, [requestDisplayMode]);

  const heading = "猫の休憩ギャラリー";
  const description = useMemo(() => {
    if (toolOutput?.message) {
      return toolOutput.message;
    }
    if (toolOutput?.generatedAt) {
      const date = new Date(toolOutput.generatedAt);
      if (!Number.isNaN(date.valueOf())) {
        return `The Cat API から取得した最新の猫たち (${date.toLocaleString()})`;
      }
    }
    return "The Cat API から取得した猫の写真を横スクロールで眺められます。";
  }, [toolOutput?.generatedAt, toolOutput?.message]);

  if (photos.length === 0) {
    return (
      <div className="cat-widget-shell">
        <div className="cat-widget-empty">{FALLBACK_MESSAGE}</div>
        <div className="cat-widget-footer">Powered by The Cat API</div>
      </div>
    );
  }

  return (
    <div className="cat-widget-shell">
      <CatGalleryCarousel
        photos={photos}
        heading={heading}
        description={description}
      />
      <div className="cat-widget-footer">Powered by The Cat API</div>
    </div>
  );
}
