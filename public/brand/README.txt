Panameer brand assets

USE THIS ONE (headers, any light or tinted surface):
- panameer-logo-transparent.png : full logo, navy wordmark, TRANSPARENT surround.

  Render it through `src/components/Logo.tsx` rather than an <img> — that
  component is what guarantees the right asset, and every bypass is a chance to
  reach for the wrong one.

- panameer-logo-on-dark.png : full logo, magenta wordmark — DARK backgrounds.
- panameer-mark.png         : mark only (favicon / compact). Transparent.

DO NOT USE on a page:
- panameer-logo.png        : the ORIGINAL export. Its surround is opaque WHITE,
  so it renders as a white box on any tinted background. That is E007, and it
  came back as E120 because this file said to use it "on LIGHT backgrounds".
  Kept only as the source the transparent version was made from.
- panameer-mark-circle.png : opaque corners, same problem.

Brand: magenta #D72CD6 · navy #171E3E · fonts Comfortaa (display/logo) + Montserrat (body)
