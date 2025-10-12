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

function createAltText(image: CatImage): string {
  const breedName = image.breeds?.[0]?.name;
  return breedName ? `猫の写真 (${breedName})` : "猫の写真";
}

function createAttribution(image: CatImage): string {
  const breedName = image.breeds?.[0]?.name;
  return breedName
    ? `Image courtesy of The Cat API ― Breed: ${breedName}`
    : "Image courtesy of The Cat API";
}

export async function fetchCatGallery(
  limit = 8,
  signal?: AbortSignal
): Promise<CatPhoto[]> {
  const apiKey = process.env.CAT_API_KEY ?? process.env.VITE_CAT_API_KEY ?? "";

  const params = new URLSearchParams({
    limit: String(limit),
    has_breeds: "1",
    order: "RAND"
  });

  const headers: Record<string, string> = { Accept: "application/json" };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    headers,
    signal
  });

  if (!response.ok) {
    throw new Error(`Cat API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CatImage[];

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
    } satisfies CatPhoto;
  });
}
