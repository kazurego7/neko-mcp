import React from "react";
import { createRoot } from "react-dom/client";
import CatGalleryWidget from "./CatGalleryWidget";
import "./cat-gallery.css";
import type { CatPhoto } from "../api/catApi";

declare global {
  interface Window {
    openai?: any;
  }
}

const defaultSamplePhotos: CatPhoto[] = [
  {
    id: "sample-1",
    url: "https://cdn2.thecatapi.com/images/bpc.jpg",
    alt: "猫の写真 (サンプル1)",
    attribution: "Image courtesy of The Cat API",
    breedName: "サンプル猫",
    temperament: "Friendly, Calm",
    origin: "Sample",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cat"
  },
  {
    id: "sample-2",
    url: "https://cdn2.thecatapi.com/images/6qi.jpg",
    alt: "猫の写真 (サンプル2)",
    attribution: "Image courtesy of The Cat API",
    breedName: "サンプル猫",
    temperament: "Curious, Playful",
    origin: "Sample",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Cat"
  }
];

if (typeof window !== "undefined" && !window.openai) {
  window.openai = {
    toolOutput: {
      photos: defaultSamplePhotos,
      generatedAt: new Date().toISOString(),
      message: "デモ用の猫画像です。"
    }
  } as const;
}

const rootElement = document.getElementById("cat-gallery-root");

if (!rootElement) {
  throw new Error("cat-gallery-root が見つかりませんでした");
}

createRoot(rootElement).render(<CatGalleryWidget />);
