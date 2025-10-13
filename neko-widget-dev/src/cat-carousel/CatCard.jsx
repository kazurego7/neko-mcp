import React from "react";

export default function CatCard({ cat }) {
  if (!cat) return null;

  return (
    <figure className="group min-w-[220px] select-none max-w-[220px] w-[65vw] sm:w-[220px] self-stretch">
      <div className="w-full overflow-hidden rounded-2xl ring ring-black/5 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]">
        <img
          src={cat.imageUrl}
          alt="猫の写真"
          className="w-full aspect-square object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
        />
      </div>
    </figure>
  );
}
