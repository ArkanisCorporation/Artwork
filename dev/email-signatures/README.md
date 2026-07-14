# Arkanis Corporation OÜ — Email Signatures

Outlook-compatible HTML email signatures for the Arkanis founders, in five design
variants. Built email-first: table layout, inline styles, web-safe fonts
(Segoe UI / Arial — no webfont survives Outlook), and PNG artwork referenced by
relative path (Outlook embeds them as `cid:` on send).

## What's here

```
email-signatures/
├── assets/                      ← shared images (MUST travel with the .htm files)
│   ├── seal.png                 ← glow Blossom Star (the "wax seal")
│   ├── wordmark.png             ← "ARKANIS CORPORATION" text-only wordmark, white
│   └── hrule.png                ← 2px cyan→violet→magenta gradient hairline
├── Arkanis-Signature-A1-Sealed-Card-star-left-<Person>.htm
├── Arkanis-Signature-A2-Sealed-Card-star-right-<Person>.htm
├── Arkanis-Signature-B-Letterhead-<Person>.htm
├── Arkanis-Signature-C-Monogram-<Person>.htm
└── Arkanis-Signature-D-Monogram-gradient-<Person>.htm
```

`<Person>` = `Delta` (Merlin) or `KronnY` (Daniel). 5 variants × 2 people = 10 files.

## The variants

| Variant | Look | Outlook behaviour |
| ------- | ---- | ----------------- |
| **A1** Sealed Card (star left) | Full Delta-Black card; seal top-left beside wordmark | Dark fill holds; **square** corners in classic Outlook (rounded elsewhere) |
| **A2** Sealed Card (star right) | Full Delta-Black card; big glow seal beside the name | Same as A1 |
| **B** Letterhead | White contact block + gradient spine + slim dark footer band | Spine → solid violet in Outlook; gradient elsewhere |
| **C** Monogram | Neutral hairline + live text, no images | Essentially bulletproof — renders identically everywhere |
| **D** Monogram (gradient spine) | C, but the spine is the brand gradient | Spine → solid violet in Outlook; gradient elsewhere |

Link colours follow the brand contrast rule: **cyan** on the dark card, **deep blue /
violet** on white.

## Install — Outlook (Windows, desktop)

1. Close Outlook.
2. Open the signatures folder: press `Win+R`, paste
   `%APPDATA%\Microsoft\Signatures`, Enter.
3. Copy the chosen `.htm` **and** the whole `assets/` folder into it. Keep them
   side by side — the `.htm` references `assets/…` relatively.
4. (Optional) Rename the `.htm` to the name you want to see in Outlook's menu,
   e.g. `Arkanis.htm`.
5. Open Outlook → **File ▸ Options ▸ Mail ▸ Signatures**, and the signature appears
   in the list. Assign it to New messages / Replies as desired.

> **Note:** Outlook may re-package the images into a `<name>_files` folder the first
> time you open the signature editor — that's normal and still works.

## Install — new Outlook / Outlook on the web, Apple Mail, Gmail

These render the same HTML but don't use the Signatures folder. Easiest path: open the
`.htm` in a browser, select-all, copy, and paste into the client's signature editor.
(Gmail and Apple Mail keep the images; for new Outlook web you may need the images
hosted at a public URL instead of local files — ask and I'll produce a hosted-URL build.)

## Optional: rounded corners in classic Outlook (VML)

Classic Outlook (Word engine) ignores `border-radius`, so the **A** cards show crisp
square corners there. To force rounded corners in Outlook too, wrap the card's outer
`<table>` in a VML `roundrect`. **Test in your actual Outlook before rolling out** — VML
is finicky:

```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
     arcsize="8%" fillcolor="#0e0e0f" style="width:520px;">
<v:textbox inset="0,0,0,0">
<![endif]-->

  <!-- the existing <table …bgcolor="#0e0e0f" …> … </table> goes here unchanged -->

<!--[if mso]>
</v:textbox>
</v:roundrect>
<![endif]-->
```

## Affinity design sources (`Signatures.af`)

`Signatures.af` (this folder) holds all 10 designs as named artboards — 5 variants × 2
founders, laid out in a grid (columns = founders, rows = variants). It is the **design
source for manual editing only**; the `.htm` files above stay the delivery format.

> **Do not use SVG or Affinity output for the email itself.** Classic Outlook never
> rendered SVG, and since September 2025 Microsoft actively blocks inline SVG in Outlook
> web and new Outlook for Windows (blank placeholder, XSS mitigation). PNG stays.

Built by `build-signatures.affinity.js` through the Affinity MCP server (Affinity by
Canva 3.2.2+, **Edit ▸ Settings ▸ Model Context Protocol**). The same script is saved in
Affinity's script library as *"Arkanis — Build Email Signature Artboards"*.

- **Re-runnable.** The script wipes the spread and rebuilds from scratch, so edit the
  constants and re-run rather than hand-patching 10 artboards. **It destroys manual
  edits** — including placed logo art. Place art last, or re-place after a rebuild.
- **Logo art is deliberately not recreated.** Seal and wordmark are named placeholder
  rects (`SEAL-PLACEHOLDER 42x42`, `WORDMARK-PLACEHOLDER 196x35`, …) at the exact
  position and size the `.htm` uses. Place the native art from `Logos/logo.afdesign`
  over them and apply the glow as a live layer FX (`Logos/color/color_glow.svg` imports
  badly — 142 radial gradients, embedded raster, no viewBox).
- Text is live `ArtText`, one node per line, so every string stays individually
  editable. Geometry mirrors the `.htm` exactly; baselines are derived from Segoe UI
  font metrics rather than eyeballed.

Gotchas worth knowing before scripting Affinity here (all verified against 3.2.2.4557):

| Thing | Reality |
| ----- | ------- |
| Script filesystem access | **Desktop-only.** Any `D:` path throws `PERMISSION_DENIED`, including `Document.load`. Already-open documents are exempt — that's why the script edits `Signatures.af` in place and calls `doc.save()`. `saveAs` to `D:` is denied. |
| Coordinates | Always **pixels**, whatever the document's display units say. |
| Font size vs tracking | `GlyphAttDoubleType.Height` is in **pixels**; `CharacterSpacing` is in **em** (pass `0.22` for CSS `.22em`, not `2.42`). |
| `doc.dpi` setter | Silently does nothing. `doc.units` does work. |
| `Document.close()` | `NOT_IMPLEMENTED` — close documents by hand. |
| Cross-document copy | Unsupported; `createMoveNodes` between documents fails. Build in the target document. |

## Regenerating

Source templates and the build script live in the design scratchpad (per-variant body
templates + a Python builder that stamps name/role/email per person). Artwork is
exported from `Logos/logo.afdesign` via Affinity — never hand-edit the PNGs; re-export
and re-run the optimiser. Ping Delta for the build script if you need to change copy or
add a person.
