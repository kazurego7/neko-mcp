import React from "react";
import { Cat, MapPin } from "lucide-react";

export default function CatCard({ cat }) {
  if (!cat) return null;

  return (
    <div className="min-w-[220px] select-none max-w-[220px] w-[65vw] sm:w-[220px] self-stretch flex flex-col">
      <div className="w-full">
        <img
          src={cat.imageUrl}
          alt={cat.name}
          className="w-full aspect-square rounded-2xl object-cover ring ring-black/5 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex flex-col flex-1 flex-auto">
        <div className="text-base font-medium truncate line-clamp-1 flex items-center gap-2">
          <Cat className="h-4 w-4 text-black/70" aria-hidden="true" />
          {cat.name}
        </div>
        <div className="text-xs mt-1 text-black/60 flex items-center gap-1">
          {cat.origin ? (
            <>
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span>{cat.origin}</span>
            </>
          ) : null}
          {cat.lifeSpan ? <span>· 平均寿命 {cat.lifeSpan} 年</span> : null}
        </div>
        {cat.temperament ? (
          <div className="text-sm mt-2 text-black/80">{cat.temperament}</div>
        ) : null}
        {cat.description ? (
          <div className="text-xs mt-3 text-black/60 leading-relaxed line-clamp-3">
            {cat.description}
          </div>
        ) : null}
        <div className="mt-5">
          {cat.wikipediaUrl ? (
            <a
              href={cat.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-[#F46C21] text-white px-4 py-1.5 text-sm font-medium hover:opacity-90 active:opacity-100"
            >
              もっと知る
            </a>
          ) : (
            <div className="text-xs text-black/40">詳細情報がありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
