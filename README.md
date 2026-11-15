# TreatYourselfDiscounts — rebuilt from scratch

A multi-page rebuild of TreatYourselfDiscounts.com — the Pond / yellow
rubber-duck site by Lucy the duck. This is a NEW rebuild, in a new folder.
It does not touch the original site, and it does not touch the earlier
single-page TEST rebuild (which scored D+).

## What changed vs the D+ rebuild

- Multi-page site (12 pages), each with its own title and meta description.
  No single-page app, no fixed bottom bar covering content.
- Every Shop Deal / code link is a real outbound link to the retailer.
  No dead buttons: every Add form saves to localStorage and renders.
- Korean flashcards have NO 3D flip. They are readable on first load,
  with a real Show/Hide answer toggle, shuffle, practice and listening
  (speech synthesis).
- Recipes: every recipe listed here opens ingredients + steps. The page
  honestly states how many are listed (see recipes.html) against the
  262-recipe cookbook total. No fake times or stars.
- No generic brand-deal cards. Only the 9 verified Top Deals.
- Photos: a few verified Unsplash food/kitchen photos (checked with
  curl -I, 200 + image/jpeg). Deal tiles are clean colour blocks with
  the product name in text — no emoji as the whole tile.
- Sitemap, robots.txt, 404 page, copy-link buttons, per-page titles.

## Publish

Upload these files to a GitHub repository and enable GitHub Pages
(Deploy from a branch, main, root folder). Update the base URL in
sitemap.xml and robots.txt to the final published URL first.

## Files

- 404.html
- README.md
- about.html
- app.js
- books.html
- countdowns.html
- deals.html
- index.html
- korean.html
- news.html
- pantry.html
- planner.html
- recipes.html
- robots.txt
- search.html
- sitemap.xml
- style.css
- travel.html

