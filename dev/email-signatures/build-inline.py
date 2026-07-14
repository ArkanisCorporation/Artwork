#!/usr/bin/env python3
"""Build the base64-inlined ("-inline") signature variants for pasting into Outlook web.

The normal .htm builds reference assets/*.png by relative path, which Outlook web /
new Outlook can't resolve when you paste markup into their signature editor. These
builds stamp the images in as data: URIs so the file is fully self-contained.

Two variants also paint their spine with a CSS linear-gradient. Paste sanitizers
routinely drop background-image, which would silently flatten the brand gradient to a
solid violet, so the inline builds swap it for a real gradient PNG (assets/vspine.png)
sized to the measured cell height.

Not every variant needs a build:
  A1, A2  - 3 images each (seal, wordmark, hrule)          -> inlined
  B       - 2 images + gradient spine (74px)               -> inlined + spine swap
  D       - no images, gradient spine (87px)               -> spine swap only
  C       - no images, no gradient: already self-contained -> SKIPPED, see README

Usage:
    python build-inline.py           # write all inline builds
    python build-inline.py --check   # verify regeneration is byte-identical, write nothing
"""
import base64
import pathlib
import sys

SIG = pathlib.Path(__file__).resolve().parent
PEOPLE = ("Delta", "KronnY")

# The spine <td> as it appears in the plain build. B centres it, D tops it; both are
# replaced by the same image cell. Height is the measured rendered cell height.
SPINE_PLAIN = (
    '<td valign="{valign}" width="3" bgcolor="#4300c0" style="width:3px;'
    'background-color:#4300c0;background-image:linear-gradient(180deg,#00b8d4,'
    '#4300c0 55%,#c81e9b);font-size:0;line-height:0;">&#8203;</td>'
)
SPINE_INLINE = (
    '<td valign="top" width="3" style="width:3px;font-size:0;line-height:0;">'
    '<img src="data:image/png;base64,{b64}" width="3" height="{h}" alt="" '
    'style="display:block;width:3px;height:{h}px;border:0;outline:none;"></td>'
)

# stem -> (spine valign in the plain build, spine height px) or None for no spine swap.
VARIANTS = {
    "A1-Sealed-Card-star-left": None,
    "A2-Sealed-Card-star-right": None,
    "B-Letterhead": ("middle", 74),
    "D-Monogram-gradient": ("top", 87),
    # C-Monogram deliberately absent: no images, no gradient, so an inline build would
    # be a byte-identical copy of the plain file. Paste the plain file directly.
}


def b64(path: pathlib.Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def build(stem: str, person: str) -> str:
    src = SIG / f"Arkanis-Signature-{stem}-{person}.htm"
    # newline="" preserves the source file's line endings exactly.
    html = src.read_text(encoding="utf-8", newline="")

    spine = VARIANTS[stem]
    if spine:
        valign, height = spine
        needle = SPINE_PLAIN.format(valign=valign)
        if needle not in html:
            sys.exit(f"FAIL: spine markup not found in {src.name} - template drifted?")
        html = html.replace(needle, SPINE_INLINE.format(b64=b64(SIG / "assets" / "vspine.png"), h=height))

    for asset in ("seal", "wordmark", "hrule"):
        needle = f'src="assets/{asset}.png"'
        if needle in html:
            html = html.replace(needle, f'src="data:image/png;base64,{b64(SIG / "assets" / f"{asset}.png")}"')

    # The whole point is self-containment: refuse to emit a build that still reaches out.
    if "assets/" in html or "linear-gradient" in html:
        sys.exit(f"FAIL: {src.name} still has an external ref or CSS gradient after inlining")
    return html


def main() -> None:
    check = "--check" in sys.argv
    failures = 0
    for stem in VARIANTS:
        for person in PEOPLE:
            out = build(stem, person)
            dest = SIG / f"Arkanis-Signature-{stem}-{person}-inline.htm"
            if check:
                if not dest.exists():
                    print(f"MISSING  {dest.name}")
                    failures += 1
                    continue
                same = dest.read_text(encoding="utf-8", newline="") == out
                print(f"{'OK      ' if same else 'DIFFERS '} {dest.name}")
                failures += 0 if same else 1
            else:
                dest.write_text(out, encoding="utf-8", newline="")
                print(f"wrote {dest.name} ({len(out):,} chars)")
    if check and failures:
        sys.exit(f"{failures} file(s) not reproducible")


if __name__ == "__main__":
    main()
