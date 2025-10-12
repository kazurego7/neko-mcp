import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CatGalleryCarousel from "./components/CatGalleryCarousel";
import { fetchCatGallery, type CatPhoto } from "./api/catApi";

const GALLERY_SIZE = 8;

export default function App() {
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CatPhoto[]>([]);
  const [freshPhotoIds, setFreshPhotoIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const freshTimerRef = useRef<number | null>(null);

  const hasApiKey = useMemo(
    () => Boolean(import.meta.env.VITE_CAT_API_KEY),
    []
  );

  const loadGallery = useCallback(
    async (mode: "replace" | "append" = "replace") => {
      if (mode === "append") {
        // 過剰な並列リクエストを避ける
        if (isLoadingMore) {
          return;
        }
      } else {
        abortControllerRef.current?.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (mode === "replace") {
        setIsLoadingInitial(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const gallery = await fetchCatGallery({
          signal: controller.signal,
          limit: GALLERY_SIZE
        });

        setPhotos((prev) => {
          if (mode === "append") {
            const existingIds = new Set(prev.map((item) => item.id));
            const merged = gallery.filter((item) => !existingIds.has(item.id));
            if (merged.length > 0) {
              setFreshPhotoIds(merged.map((item) => item.id));
              if (freshTimerRef.current) {
                window.clearTimeout(freshTimerRef.current);
              }
              freshTimerRef.current = window.setTimeout(() => {
                setFreshPhotoIds([]);
                freshTimerRef.current = null;
              }, 900);
              return [...prev, ...merged];
            }
            return prev;
          }
          return gallery;
        });

        setError(null);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError("猫たちを読み込めませんでした。少し時間を置いて再試行してください。");
      } finally {
        if (mode === "replace") {
          setIsLoadingInitial(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [isLoadingMore]
  );

  const handleCollapse = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGalleryVisible(false);
    setError(null);
  }, []);

  const handleToggleGallery = useCallback(() => {
    if (isGalleryVisible) {
      handleCollapse();
      return;
    }
    setIsGalleryVisible(true);
    void loadGallery("replace");
  }, [handleCollapse, isGalleryVisible, loadGallery]);

  const handleRetry = useCallback(() => {
    void loadGallery("replace");
  }, [loadGallery]);

  const handleLoadMore = useCallback(() => {
    void loadGallery("append");
  }, [loadGallery]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (freshTimerRef.current) {
        window.clearTimeout(freshTimerRef.current);
        freshTimerRef.current = null;
      }
    };
  }, []);

  return (
    <main className="app-shell">
      <h1 className="app-title">OpenAI Apps SDK Minimal Sample</h1>
      <p className="app-body">
        ここから猫のウィジェットを組み込めるように、React ベースの最小構成を用意しています。
        現時点では表示だけですが、Apps SDK のマニフェストや MCP 連携を追加するための
        ベースとして利用できます。
      </p>

      <section className="cta-group">
        <h2>猫と休憩する</h2>
        <p>
          「ちょっと休憩したい」シナリオを想定し、CatAPI から画像を取得してインラインカルーセルで表示します。
          ボタンを押すと最新の猫が横スクロールで現れます。
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={handleToggleGallery}
        >
          {isGalleryVisible ? "ギャラリーを閉じる" : "猫ギャラリーを表示"}
        </button>
        {!hasApiKey && (
          <p className="note">
            API キーが未設定のため、リクエスト回数が非常に限られます。
            `.env.local` に `VITE_CAT_API_KEY` を設定すると安定して取得できます。
          </p>
        )}
      </section>

      {isGalleryVisible && (
        <CatGalleryCarousel
          photos={photos}
          isLoading={isLoadingInitial}
          isLoadingMore={isLoadingMore}
          error={error}
          heading="猫ギャラリー"
          description="CatAPI から取得した猫の写真をインラインカルーセルで表示します。"
          onRetry={handleRetry}
          onCollapse={handleCollapse}
          onLoadMore={handleLoadMore}
          freshPhotoIds={freshPhotoIds}
        />
      )}
    </main>
  );
}
