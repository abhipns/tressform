// Quick-pick hairstyles for the owner's Studio page (/admin/studio).
//
// 10.10.2026: these now come straight from the one hairstyle list
// (lib/content/hairstyles.ts) instead of a separate starter set of 12, so
// the Studio offers all 30 men's and 30 women's styles and uses exactly
// the description a customer's preview will use. They are grouped by how
// much hair the cut needs, which is also how to choose a model photo: a
// short cut can be made from any photo, a long style needs long hair.

import { frontDescription, hairstylesFor, type HairGender, type Hairstyle, type StyleNeeds } from "./hairstyles";

export interface StudioStyle {
  /** What the owner sees and what the image is filed under. */
  label: string;
  /** What the image model is told, in barber's / stylist's terms. */
  prompt: string;
  /** A style for naturally curly or wavy hair: it needs a photo of someone with curls. */
  curlyOnly?: boolean;
}

export interface StudioGroup {
  title: string;
  hint: string;
  styles: StudioStyle[];
}

const GROUPS: Record<HairGender, { title: string; hint: string; needs: StyleNeeds[] }[]> = {
  men: [
    { title: "Short cuts", hint: "works on any photo", needs: ["very-short", "short"] },
    { title: "Medium cuts", hint: "best on a photo with medium or long hair", needs: ["medium"] },
    { title: "Long styles", hint: "needs a photo with long hair", needs: ["long"] },
  ],
  women: [
    { title: "Long hair", hint: "needs a photo with hair below the shoulder", needs: ["below-shoulder"] },
    { title: "Shoulder length", hint: "best on a photo with shoulder-length or longer hair", needs: ["shoulder"] },
    { title: "Short hair", hint: "works on any photo", needs: ["chin", "ear"] },
  ],
};

function toStudioStyle(style: Hairstyle): StudioStyle {
  // The Studio makes front pictures, so it uses the front-view description.
  return { label: style.name, prompt: frontDescription(style), curlyOnly: style.texture[0] === 0 };
}

function groupsFor(gender: HairGender): StudioGroup[] {
  const styles = hairstylesFor(gender);
  return GROUPS[gender].map((group) => ({
    title: group.title,
    hint: group.hint,
    styles: styles.filter((style) => group.needs.includes(style.needs)).map(toStudioStyle),
  }));
}

export const STUDIO_GROUPS: Record<HairGender, StudioGroup[]> = {
  men: groupsFor("men"),
  women: groupsFor("women"),
};

export const STUDIO_STYLES: Record<HairGender, StudioStyle[]> = {
  men: STUDIO_GROUPS.men.flatMap((group) => group.styles),
  women: STUDIO_GROUPS.women.flatMap((group) => group.styles),
};
