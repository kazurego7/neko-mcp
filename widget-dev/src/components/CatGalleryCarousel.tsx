import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from "react";
import type { CatPhoto } from "../api/catApi";

type Props = {
  photos: CatPhoto[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  heading?: string;
  description?: string;
  onRetry?: () => void;
  onCollapse?: () => void;
  onLoadMore?: () => void;
  freshPhotoIds?: string[];
};

const SCROLL_STEP = 320;
const PRELOAD_OFFSET = 280;

export function CatGalleryCarousel({
  photos,
  isLoading = false,
  isLoadingMore = false,
  error,
  heading = "ひと休みギャラリー",
  description = "The Cat API から取得した写真を横スクロールで表示します。気になった猫は Wikipedia で詳細もチェックできます。",
  onRetry,
  onCollapse,
  onLoadMore,
  freshPhotoIds
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasRequestedMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const highlightIds = useMemo(
    () => new Set(freshPhotoIds ?? []),
    [freshPhotoIds]
  );

  const hasPhotos = useMemo(() => photos.length > 0, [photos.length]);

  const syncScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = viewport;
    const maxScrollLeft = scrollWidth - clientWidth - 1; // allow rounding error

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScrollLeft);
  }, []);

  const maybeLoadMore = useCallback(() => {
    if (!onLoadMore || isLoadingMore || hasRequestedMoreRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = viewport;
    const remaining = scrollWidth - clientWidth - scrollLeft;

    if (hasPhotos && remaining <= PRELOAD_OFFSET) {
      hasRequestedMoreRef.current = true;
      onLoadMore();
    }
  }, [hasPhotos, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    syncScrollState();
    const handleScroll = () => {
      syncScrollState();
      maybeLoadMore();
    };
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [maybeLoadMore, photos, syncScrollState]);

  useEffect(() => {
    if (!onLoadMore) {
      return;
    }

    const viewport = viewportRef.current;
    const sentinel = sentinelRef.current;
    if (!viewport || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !isLoadingMore &&
            !hasRequestedMoreRef.current
          ) {
            hasRequestedMoreRef.current = true;
            onLoadMore();
          }
        });
      },
      {
        root: viewport,
        rootMargin: "0px 240px 0px 0px",
        threshold: 0.2
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isLoadingMore, onLoadMore]);

  useEffect(() => {
    if (!isLoadingMore) {
      hasRequestedMoreRef.current = false;
    }
  }, [isLoadingMore]);

  const handleScrollBy = useCallback(
    (direction: "left" | "right") => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      const amount = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
      viewport.scrollBy({ left: amount, behavior: "smooth" });
      if (direction === "right") {
        maybeLoadMore();
      }
    },
    [maybeLoadMore]
  );

  const handleCardClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // Allow middle-click to open in new tab without preventing default
    if (event.button !== 0) {
      return;
    }

    // Keep inline behaviour consistent: open link in new tab to avoid losing context
    event.preventDefault();
    window.open(event.currentTarget.href, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <section
      className="gallery-inline"
      aria-label="猫の画像カルーセル"
      aria-live="polite"
    >
      <header className="gallery-inline__header">
        <div>
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>
        {onCollapse && (
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={onCollapse}
          >
            非表示にする
          </button>
        )}
      </header>

      {isLoading && (
        <div className="gallery-inline__state" role="status">
          <span className="loader" aria-hidden="true" />
          <p>猫たちを呼び出しています…</p>
        </div>
      )}

      {!isLoading && error && !hasPhotos && (
        <div className="gallery-inline__state error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              className="primary-button"
              onClick={onRetry}
              aria-label="猫画像の取得を再試行"
            >
              もう一度読み込む
            </button>
          )}
        </div>
      )}

      {!isLoading && error && hasPhotos && (
        <div className="gallery-inline__banner" role="status">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={onRetry}
            >
              再読み込み
            </button>
          )}
        </div>
      )}

      {!isLoading && hasPhotos && (
        <div className="carousel">
          <button
            type="button"
            className="carousel__nav"
            aria-label="前の猫を見る"
            onClick={() => handleScrollBy("left")}
            disabled={!canScrollLeft}
          >
            ‹
          </button>
          <div className="carousel__viewport" ref={viewportRef} role="list">
            {photos.map((photo) => (
              <article
                key={photo.id}
                role="listitem"
                className={`carousel__card${
                  highlightIds.has(photo.id) ? " carousel__card--new" : ""
                }`}
              >
                <figure>
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    loading="lazy"
                    width="240"
                    height="180"
                  />
                  <figcaption>
                    <strong>{photo.breedName ?? "ミステリアスな猫"}</strong>
                    {photo.origin && <span>{photo.origin}</span>}
                  </figcaption>
                </figure>
                {photo.temperament && (
                  <p className="carousel__meta">{photo.temperament}</p>
                )}
                {photo.wikipediaUrl && (
                  <a
                    href={photo.wikipediaUrl}
                    className="carousel__link"
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCardClick}
                  >
                    Wikipedia で詳しく見る
                  </a>
                )}
                <footer>
                  <small>{photo.attribution}</small>
                </footer>
              </article>
            ))}
            {isLoadingMore && (
              <div className="carousel__card carousel__card--loading" aria-hidden="true">
                <div className="carousel__loading">
                  <span className="loader loader--mini" />
                  <span>新しい猫を読み込み中…</span>
                </div>
              </div>
            )}
            <div ref={sentinelRef} className="carousel__sentinel" aria-hidden="true" />
          </div>
          <button
            type="button"
            className="carousel__nav"
            aria-label="次の猫を見る"
            onClick={() => handleScrollBy("right")}
            disabled={!canScrollRight}
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

export default CatGalleryCarousel;
