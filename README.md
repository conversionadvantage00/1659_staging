# 1659 Wine Time

Microsite for 1659 South Africa: four wines, four moods and one question, "what's your wine time?"

This is a plain static site (HTML, CSS and JavaScript), so it needs no build step and runs as it is on GitHub Pages.

## Files

```
index.html          the whole page
assets/
  css/style.css     all styles
  js/               main.js (animation, nav, form), sky.js (slider sky), slider.js (the wine time slider)
  img/              every image the page uses
  docs/             the four tasting note PDFs
.nojekyll           tells GitHub Pages to serve the files as they are
```

## Put it online with GitHub Pages

1. Create a new repository on GitHub and upload everything in this folder, keeping the folder structure. `index.html` must sit at the top of the repository, next to `README.md`.
2. In the repository, open **Settings**, then **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, then save.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repository-name>/`.

Open the site through that link, not by double-clicking `index.html`. Some browsers block scripts on files opened straight from disk.

## What the site loads from the internet

- GSAP, ScrollTrigger and Lenis (animation and smooth scrolling) from cdnjs and jsDelivr.
- The Baskervville font from Google Fonts.

The site needs a connection for these. To make it fully self-contained later, download them into `assets/js` and `assets/css` and point the `<script>` and `<link>` tags at the local copies.

## Still to do before a real launch

- **Enquiry form:** it is a demo. It checks the fields and shows a thank-you message but sends nothing. Connect it to a form service that delivers to info@1659.co.za.
- **Share image:** add an `og:image` tag with a full web address once the final domain is known, so shared links show a preview picture.
- **Content to confirm with the client:** separate Sweet Red and Classic Red tasting notes (the two PDFs currently share wording), upcoming events, and review of the cheeky copy against the alcohol code.
- **Images:** compress and re-check licences before launch.

## Notes

- Brand: 1659 South Africa, made by Leopard's Leap Family Vineyards, Franschhoek. Not for sale to persons under 18.
- Desktop uses a liquid hover effect in the nav bar. Phones get the slimmer menu and a cycling banner arch. Reduced-motion settings switch the animation off.
