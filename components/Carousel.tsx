// Examples — "One photo in. Five haircuts to compare."
//
// 11.10.2026: back on the home page, rebuilt. The old version was a strip
// of cartoon heads standing in for photos and was hidden in the design
// pass for that reason. This one shows real Tressform output: each person's
// starting photo followed by five previews made from it, each named.
//
// TWO LAYOUTS, chosen by how many people there are (lib/content/carousel.ts):
//   1–3 people  each person is one row read left to right: the photo, then
//               the five cuts. On a phone the row swipes sideways.
//   4 or more   the cards become a slow moving strip that pauses under the
//               pointer. Visitors who ask their device for less motion get
//               a strip they scroll themselves instead.
//
// The intro says plainly that these are model photos and not customers.

import Image from "next/image";
import { CAROUSEL_PEOPLE, type CarouselPerson } from "@/lib/content/carousel";

const MOVING_STRIP_FROM = 4;
const SECONDS_PER_CARD = 14;

function Tile({ src, alt, caption, original = false }: { src: string; alt: string; caption: string; original?: boolean }) {
  return (
    <figure>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-mint-pale sm:rounded-[16px]">
        <Image src={src} alt={alt} width={560} height={700} sizes="(min-width: 1024px) 280px, (min-width: 640px) 30vw, 44vw" className="h-full w-full object-cover" />
        {original && (
          <span className="absolute left-2 top-2 rounded-full bg-header-dark/85 px-2.5 py-1 text-[11.5px] font-semibold leading-none text-white">
            Original
          </span>
        )}
      </div>
      <figcaption
        className={`mt-2 text-[13.5px] leading-[1.3] sm:text-[14.5px] ${original ? "text-ink-muted" : "font-semibold text-ink-heading"}`}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

function tilesFor(person: CarouselPerson) {
  return [
    <Tile key="original" src={person.original} alt={`The original photo of ${person.who}.`} caption="The photo uploaded" original />,
    ...person.previews.map((preview) => (
      <Tile
        key={preview.src}
        src={preview.src}
        alt={`A Tressform preview of ${person.who} with this haircut: ${preview.style}.`}
        caption={preview.style}
      />
    )),
  ];
}

/** One person as a row: the photo, then the cuts. Swipes sideways on a phone. */
function PersonRow({ person }: { person: CarouselPerson }) {
  return (
    <li className="rounded-[24px] bg-bg p-3 sm:p-4 lg:rounded-[28px] lg:p-5">
      <ul className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {tilesFor(person).map((tile) => (
          <li key={tile.key} className="w-[42%] shrink-0 snap-start sm:w-auto">
            {tile}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** One person as a compact card, for the moving strip. */
function PersonCard({ person, hidden = false }: { person: CarouselPerson; hidden?: boolean }) {
  return (
    <li aria-hidden={hidden || undefined} className="mr-5 w-[300px] shrink-0 rounded-[24px] bg-bg p-3 sm:w-[540px] sm:p-4">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {tilesFor(person).map((tile) => (
          <li key={tile.key}>{tile}</li>
        ))}
      </ul>
    </li>
  );
}

export default function Carousel() {
  const people = CAROUSEL_PEOPLE;
  if (people.length === 0) return null;

  const moving = people.length >= MOVING_STRIP_FROM;
  // The strip slides left by exactly half its width and starts again, so it
  // is built from two identical halves; each half is at least six cards
  // long so that even a very wide screen never shows the end.
  const half = moving ? Array.from({ length: Math.ceil(6 / people.length) }, () => people).flat() : [];

  return (
    <section id="examples" className="overflow-hidden bg-bg-soft text-ink-body">
      <div className="frame pt-16 sm:pt-20 lg:pt-28">
        <div className="grid items-end gap-x-16 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] xl:gap-x-24">
          <h2 className="h-display max-w-[17ch]">One photo in. Five haircuts to compare.</h2>
          <p className="lead max-w-[54ch]">
            Each {moving ? "card" : "row"} is one person. The first picture is the photo they uploaded. The other five are Tressform
            previews of different cuts on that same photo. These are model photos, not customers.
          </p>
        </div>
      </div>

      {moving ? (
        <div
          className="mt-10 overflow-hidden pb-16 motion-reduce:overflow-x-auto sm:pb-20 lg:mt-14 lg:pb-28"
          style={{ maskImage: "linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)" }}
        >
          <ul
            className="flex w-max animate-[scroll-left_80s_linear_infinite] pl-5 hover:[animation-play-state:paused] motion-reduce:animate-none"
            style={{ animationDuration: `${half.length * SECONDS_PER_CARD}s` }}
          >
            {half.map((person, i) => (
              <PersonCard key={`a-${i}`} person={person} hidden={i >= people.length} />
            ))}
            {half.map((person, i) => (
              <PersonCard key={`b-${i}`} person={person} hidden />
            ))}
          </ul>
        </div>
      ) : (
        <div className="frame pb-16 sm:pb-20 lg:pb-28">
          <ul className="mt-10 grid gap-5 lg:mt-14 lg:gap-6">
            {people.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
