# UrbanZole — Shopify Theme

**Urban-engineered footwear. Dark editorial design. Built for the streets.**

## Theme Design
- **Aesthetic:** Cinematic dark editorial
- **Colors:** #0A0A0A (black), #FF4500 (orange accent), #F5F0E8 (cream)
- **Fonts:** Bebas Neue (display), Instrument Sans (body), Space Mono (mono)
- **Features:** Sticky header, scroll animations, slide-out cart drawer, marquee strip, responsive grid

## File Structure
```
theme/
├── assets/
│   ├── theme.css         ← All styles
│   └── theme.js          ← All JavaScript
├── config/
│   ├── settings_schema.json
│   └── settings_data.json
├── layout/
│   └── theme.liquid      ← Main HTML wrapper
├── sections/
│   ├── header.liquid
│   ├── footer.liquid
│   ├── hero-banner.liquid
│   ├── marquee-strip.liquid
│   ├── featured-products.liquid
│   ├── split-feature.liquid
│   ├── categories-grid.liquid
│   ├── testimonials.liquid
│   └── newsletter.liquid
├── snippets/
│   ├── product-card.liquid
│   └── social-meta-tags.liquid
└── templates/
    ├── index.json        ← Homepage sections
    ├── product.liquid    ← Product page
    └── collection.liquid ← Collection page
```

## Setup — GitHub → Shopify
1. Push this repo to GitHub
2. In Shopify Admin → Online Store → Themes
3. Click **Add theme** → **Connect from GitHub**
4. Select your repository & main branch
5. Publish the theme

## Customization
All sections are configurable from **Shopify Theme Editor** (Customize).
