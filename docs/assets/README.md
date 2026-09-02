# Assets

Drop the three competition deliverables here. The main `README.md` already
links to these exact paths, so nothing else needs editing once the files land.

| File to add | What it is | Requirement |
|---|---|---|
| `obhoy-whitepaper.pdf` | The IEEE-format whitepaper | ≤ 20 pages including appendices, 11 pt, Times/Calibri/Arial, single-spaced, English |
| `obhoy-poster.pdf` | The poster board | 14400 × 10800 px (36 × 48 in @ 300 dpi), **landscape**, PDF or shared Figma, English present |
| `obhoy-poster-preview.png` | A downscaled poster preview for the README | ~2000 px wide. GitHub will not render a 14400 px PDF inline, so the README shows this and links to the PDF |

The video is not stored here — it is 600 seconds of MP4 and does not belong in
git. Put it on YouTube or Drive and paste the link into the table at the top of
the main README.

## Making the poster preview

```bash
# from a PDF poster
pdftoppm -png -r 40 -f 1 -l 1 obhoy-poster.pdf obhoy-poster-preview

# or crush an existing PNG
magick obhoy-poster.png -resize 2000x -quality 85 obhoy-poster-preview.png
```

Keep the preview under about 2 MB. A README that takes ten seconds to paint is
a README nobody scrolls.

## A note on the diagrams

The figures in the main README are **not** images. They are Mermaid, which
GitHub renders natively, which means they follow the reader's light or dark
theme, stay searchable, and can be corrected in a pull request without anyone
reopening a drawing tool.

The authoritative versions of the same figures remain the TikZ sources in the
paper (`figures/figNN_*.tex`) and the draw.io exports beside them. If a figure
here and a figure in the paper ever disagree, **the paper is correct** and this
one is stale.
