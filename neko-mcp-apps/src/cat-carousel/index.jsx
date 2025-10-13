import React from "react";
import { createRoot } from "react-dom/client";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CatCard from "./CatCard";

function App() {
  const [cats, setCats] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadCats() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://api.thecatapi.com/v1/images/search?limit=12&has_breeds=1",
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );

        if (!response.ok) {
          throw new Error(`CatAPIが ${response.status} で応答しました`);
        }

        const payload = await response.json();
        const normalizedCats = payload
          .map((entry) => {
            const breed = entry?.breeds?.[0] ?? {};
            return {
              id: entry?.id ?? entry?.url,
              name: breed?.name ?? "名前不明の猫",
              origin: breed?.origin ?? "",
              temperament: breed?.temperament ?? "",
              description: breed?.description ?? "",
              lifeSpan: breed?.life_span ?? "",
              wikipediaUrl: breed?.wikipedia_url ?? "",
              imageUrl: entry?.url ?? "",
            };
          })
          .filter((cat) => cat.id && cat.imageUrl);

        setCats(normalizedCats);
      } catch (catError) {
        if (controller.signal.aborted) return;
        console.error(catError);
        setError(
          catError instanceof Error ? catError.message : "CatAPIの取得に失敗しました"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCats();

    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!emblaApi) return;
    const updateButtons = () => {
      if (emblaApi.slideNodes().length <= 1) {
        setCanPrev(false);
        setCanNext(false);
        return;
      }
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  React.useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, cats.length]);

  const hasSlides = cats.length > 0;

  return (
    <div className="antialiased relative w-full text-black py-5 bg-white">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 max-sm:mx-5 items-stretch">
          {isLoading ? (
            <div className="text-sm text-black/60 px-4 py-10">CatAPIから読み込み中…</div>
          ) : error ? (
            <div className="text-sm text-red-500 px-4 py-10">{error}</div>
          ) : hasSlides ? (
            cats.map((cat) => <CatCard key={cat.id} cat={cat} />)
          ) : (
            <div className="text-sm text-black/60 px-4 py-10">猫のデータが見つかりませんでした。</div>
          )}
        </div>
      </div>
      {/* Edge gradients */}
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-y-0 left-0 w-3 z-[5] transition-opacity duration-200 " +
          (canPrev ? "opacity-100" : "opacity-0")
        }
      >
        <div
          className="h-full w-full border-l border-black/15 bg-gradient-to-r from-black/10 to-transparent"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
          }}
        />
      </div>
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-y-0 right-0 w-3 z-[5] transition-opacity duration-200 " +
          (canNext ? "opacity-100" : "opacity-0")
        }
      >
        <div
          className="h-full w-full border-r border-black/15 bg-gradient-to-l from-black/10 to-transparent"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
          }}
        />
      </div>
      {canPrev && (
        <button
          aria-label="Previous"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white text-black shadow-lg ring ring-black/5 hover:bg-white"
          onClick={() => emblaApi && emblaApi.scrollPrev()}
          type="button"
        >
          <ArrowLeft
            strokeWidth={1.5}
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </button>
      )}
      {canNext && (
        <button
          aria-label="Next"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white text-black shadow-lg ring ring-black/5 hover:bg-white"
          onClick={() => emblaApi && emblaApi.scrollNext()}
          type="button"
        >
          <ArrowRight
            strokeWidth={1.5}
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById("cat-carousel-root")).render(<App />);
