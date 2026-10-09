# Liziz design notes

## Direction

A calm, warm storefront centered on modest womenswear and the owner's confirmed fact that Liziz manufactures its own clothing. Abayas, dresses, hijabs, co-ords and everyday essentials are initial editable category labels, not claims about available inventory. The collection remains empty until real products are entered.

The palette comes directly from the brief. Mocha and deeper brown text maintain readability where taupe text on cream would be too faint. Serif display typography, restrained borders, quiet imagery and a stable grid replace the previous oversized streetwear type, grayscale photography and continuously moving product rails.

All former seed products, fake customer leads, brand stories, store locations, logo assets and browser-cart identity have been removed from this checkout. No pre-existing environment or database was present when work started. A new ignored local `.env` and `data/liziz.db` were created. No remote or deployed database was accessed.

## Research

- [Aab](https://us.aabcollection.com/): reference for recognizable modest-fashion collection names, garment-led presentation and clear browsing paths. Liziz's design and copy are original.
- [Nielsen Norman Group: ecommerce product pages](https://www.nngroup.com/articles/ecommerce-product-pages/): support clear product information, visible prices, recognizable purchasing actions and useful imagery.
- [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image): responsive image sizing and priority loading for the above-the-fold editorial image.

The UI/UX skill's initial automated match suggested liquid glass; that was rejected as unsuitable for this brief. A targeted minimalism search supported simpler grids, restrained motion and clear hierarchy. The supplied palette overrides generic recommended colors.

## Generated imagery

The built-in image-generation tool created two editorial assets. They are brand mood images, not photographs of actual Liziz products, a real factory, or the founder. Replace them through Admin → Content when Liziz photography is available. They are not attached to purchasable products.

Saved assets:

- `public/images/liziz-editorial.webp` — portrait campaign image, 161 KB before any further image optimization.
- `public/images/liziz-craft.webp` — textile still life, 202 KB.
- `public/images/liziz-social.jpg` — 1200 × 630 social-sharing derivative of the textile still life.

Final hero prompt (built-in tool):

> Use case: photorealistic-natural. Asset type: premium women's modest fashion website editorial hero photograph for Liziz. Create a refined fashion campaign photograph, portrait 4:5 composition. One adult woman with warm medium complexion wearing an elegant loose full-length flowing taupe abaya with subtle cuff stitching and a cream hijab fully covering her hair and neck, long sleeves, opaque fabric, modest silhouette. She stands naturally in a sunlit minimalist warm chalk plaster courtyard, a softly curved architectural doorway and textured limestone floor, quiet luxury fashion editorial, soft directional afternoon sunlight with beautiful architectural shadows. Neutral palette exclusively cream #FAF8F0, warm chalk #FDFBF4, bisque #E9D8C8, taupe #C1A990, mocha #705E51. Full garment visible, natural hands, face softly looking away, sophisticated and serene. Photorealistic tactile cloth, restrained warm color grade. No text, no logo, no watermark, no collage. This is brand mood imagery, not a specific retail product.

Final craft prompt (built-in tool):

> Use case: photorealistic-natural. Asset type: premium modest womenswear website editorial detail image for Liziz. Landscape 3:2 still life of beautifully draped cream linen, soft bisque chiffon and ribbed taupe fabric on a warm chalk stone worktable, a spool of matching thread and simple dressmaking scissors subtly at the edge. Close composition celebrates textile weave, finished seams, gentle folds, a craft-led clothing brand that manufactures its own clothes. Minimal quiet luxury magazine photograph, soft natural window light and calm shadow, warm palette #FDFBF4 #FAF8F0 #E9D8C8 #C1A990 #705E51, no bright colors, no text, no logos, no watermark, no people. Realistic tactile cloth, spacious considered framing.

## Validation

Validated locally in production mode:

- `npm run build` passes on Node.js 24.19.0.
- `npm audit` reports zero known vulnerabilities after compatible dependency updates. The SQLite driver was updated for the installed Node runtime.
- Chrome checks at 375, 768 and 1440 pixels: homepage, collection, About, bag and admin sign-in return successfully without horizontal overflow, broken images or JavaScript errors.
- Automated axe checks for WCAG A/AA rules on the main pages at phone and desktop sizes, plus the product and checkout pages, found no violations. These checks do not replace a full manual accessibility audit.
- Temporary, isolated catalog tests cover admin login, protected writes, product creation/deletion, URL search, category and price filters, required variants, persistent bag quantities, totals, checkout validation and confirmation. WhatsApp is intercepted: no external message is sent. A pre-existing race between clearing the cart and loading confirmation was fixed.
- The real Liziz database has zero products, leads, lead items and product views; five editable categories and one locally configured admin. Test data was isolated under `/tmp` and the test database was removed after verification.
- Local mobile Lighthouse homepage run: performance **97**, accessibility **100**, best practices **100**, SEO **100**. First Contentful Paint 1.0 s; Largest Contentful Paint 2.5 s; Total Blocking Time 30 ms; Cumulative Layout Shift 0. These are local lab measurements, not a guarantee of deployed or real-device performance.

## Compact shop typography and layout

The shop uses locally hosted Playfair Display (400–500) for collection and empty-state headings, with Inter (400–600) for descriptions, controls, categories, product names and prices. Other pages keep their existing typography. Latin WOFF2 subsets use `font-display: swap`; licenses are in `public/fonts`. System fonts handle other scripts.

[Google Design’s font selection guide](https://design.google/library/choosing-web-fonts-beginners-guide) supports expressive display faces for short headings and less complex sans-serif faces at small sizes. The UI/UX reference’s Classic Elegant pairing informed the Playfair Display + Inter choice.

On phones, the shop removes the promotional eyebrow, shortens the introduction, pairs search and sort in one row, and keeps category filters horizontally scrollable. Inputs stay at 16px and controls at least 44px tall. Product cards retain two columns, and selected categories also use an underline.
