import { getAssetUrl } from "./cdn";

export const getStoryImageUrl = (name: string) => getAssetUrl(`/images/heritage/display-v1/${name}`);
export const storyCoverUrl = getStoryImageUrl("2021-1.webp");

let coverPreload: HTMLImageElement | undefined;

export function preloadStoryCover() {
  if (coverPreload) return;
  coverPreload = new Image();
  coverPreload.decoding = "async";
  coverPreload.src = storyCoverUrl;
}
