export type CatBreed = {
  id: string;
  name: string;
  temperament?: string;
  origin?: string;
  description?: string;
  wikipedia_url?: string;
};

export type CatImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  breeds?: CatBreed[];
};

export type CatPhoto = {
  id: string;
  url: string;
  alt: string;
  attribution?: string;
  breedName?: string;
  temperament?: string;
  origin?: string;
  wikipediaUrl?: string;
};

const API_ENDPOINT = "https://api.thecatapi.com/v1/images/search";

const createAltText = (image: CatImage): string => {
  const breedName = image.breeds?.[0]?.name;
  if (breedName) {
    return `猫の画像: ${breedName}`;
  }

  return "猫の画像";
};

const createAttribution = (image: CatImage): string | undefined => {
  const breedName = image.breeds?.[0]?.name;
  if (breedName) {
    return `Image courtesy of The Cat API · Breed: ${breedName}`;
  }
  return "Image courtesy of The Cat API";
};

type FetchOptions = {
  signal?: AbortSignal;
  limit?: number;
  order?: "DESC" | "ASC" | "RAND";
};

export async function fetchCatGallery(
  { signal, limit = 8, order = "RAND" }: FetchOptions = {}
): Promise<CatPhoto[]> {
  const apiKey = import.meta.env.VITE_CAT_API_KEY;

  const params = new URLSearchParams({
    limit: String(limit),
    has_breeds: "1",
    order
  });

  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    headers,
    signal,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`CatAPI request failed with status ${response.status}`);
  }

  const data: CatImage[] = await response.json();

  return data.map((image) => {
    const primaryBreed = image.breeds?.[0];

    return {
      id: image.id,
      url: image.url,
      alt: createAltText(image),
      attribution: createAttribution(image),
      breedName: primaryBreed?.name,
      temperament: primaryBreed?.temperament,
      origin: primaryBreed?.origin,
      wikipediaUrl: primaryBreed?.wikipedia_url
    };
  });
}
