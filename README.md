# TreatYourselfDiscounts — New Pond Site (TEST)

A perfect, rebuilt version of TreatYourselfDiscounts.com — the Pond / yellow
rubber-duck site by Lucy the duck.

This is a **separate new site, not the current TreatYourselfDiscounts.com**.
It does not replace or overwrite the current site. It is ready to publish as
its own GitHub Pages site, so you can try it, share it, and compare it with
the live site before deciding anything.

## What is in it

One file, `index.html` — a complete, responsive, single-page app with inline
CSS and JavaScript. No external images, fonts or dependencies, so nothing can
fail to load. Emoji, CSS gradients and inline styling only.

Sections (top nav + bottom nav): Home, Today's Deals, Lucy's Recipes,
Korean Corner, Travel, Planner, Book Nook, Pantry, Countdowns, Pond Post,
About, Search.

- **Home:** “Welcome to the Pond!”, search, Today's best deals with the
  verified codes (Soundcore AFSC20, Bur Bur TYD15, IM8 Take10, Mellow Sleep,
  Frida Mom Bundle $61.98), Today in the Pond, Shop by category / brand.
- **Deals:** 8 Top Deals with store, price, was-price, % off and Save $
  (KitchenAid, Dyson, Stanley, AirPods Pro 2, Ninja Creami, LEGO Millennium
  Falcon, CeraVe, Nike Pegasus 40), plus 2 deals for each of the 17 brands
  using only the verified prices — no invented product titles. Search, sort
  and favourite hearts (saved in localStorage).
- **Recipes:** 262 recipes, 25 categories with counts, and the full 47-item
  Dessert list from the live site. Other categories show counts only — no
  recipe names were invented for them.
- **Korean Corner:** all 10 flashcards with Korean, romanization and
  English, flip / shuffle / hide-answers / practice check.
- **Travel:** Seoul and Tokyo, November 2026 calendar, packing lists.
- **Planner:** Sunday, November 15, 2026, Day / Week / Month / Year views,
  add event / note / task, doodle pad (canvas), Lucky Duck.
- **Book Nook, Pantry, Countdowns:** shelves, pantry items as on the live
  site (Pasta, Rice, Paper Towels), countdowns with a live timer.
- **Pond Post:** Sunday, November 15, 2026, Preview Edition, featured
  Walmart story and the 4 headlines from the live site.
- **About:** Lucy, Mama Goose and Duckling, story, values and FAQ.
- **Search:** search across deals, recipes, brands and pages.

## Fixes built into this rebuild

1. All chips / pills are dark text on white or yellow — readable on phone
   and desktop, never black-on-black.
2. The bottom bar is fixed but never covers content: the page has bottom
   padding, a Hide button collapses it to a small duck pill, and it never
   overlaps Save buttons or the footer.
3. Every deal card has a visible illustrated tile, price, was-price,
   % off and Save $.
4. No mirrored / reversed text, no clipped cards at the right edge —
   horizontal shelves scroll cleanly with padding.
5. Mobile-first and responsive: works at 390px and at 1920px, no sideways
   scrolling, tap targets at least 44px.
6. Search is on Home and in Deals / Recipes, with a visible Search button.
7. Every nav item goes to a real section in the app — no wrong links that
   silently show the homepage.

## How to publish it on GitHub Pages

Target repo (already created, public, empty, main branch):

**TreatYourselfDiscounts/TEST**

1. Upload `index.html` (and this `README.md`) to that repo, on the
   `main` branch, at the root.
2. On GitHub, go to the repo → **Settings → Pages**.
3. Under “Build and deployment”, choose **Deploy from a branch**,
   branch **main**, folder **/ (root)**, then Save.
4. Wait a minute or two for the deploy, then open:

**https://treatyourselfdiscounts.github.io/TEST/**

That is the new site. The current site at TreatYourselfDiscounts.com is
untouched.

## Notes

- Prices and content are from the live site as checked on Sunday,
  November 15, 2026. The live site itself warns: “Prices can change at
  the store.”
- Favourites, notes, events, tasks and books you add in this demo are
  saved in your own browser (localStorage) only.
- Some links are affiliate links. If you shop through them, I may earn a
  small commission.
- © 2026 TreatYourselfDiscounts™. All rights reserved.
- Slogan: “Feather your nest — happy hunting!”
