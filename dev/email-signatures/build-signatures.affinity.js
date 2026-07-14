// Arkanis Corporation - email signature design sources.
// Builds all 5 variants x 2 founders as 10 artboards in the open Signatures.af.
// Idempotent: wipes the spread and rebuilds, so it can be re-run after tweaks.
//
// Logo art is intentionally NOT recreated - seal/wordmark are named placeholder
// rects at exact position/size, for native art to be placed over manually.
// Geometry mirrors dev/email-signatures/*.htm (the shipped Outlook build).

const { app } = require('/application');
const { UnitType } = require('/units');
const { RGBA8, Gradient } = require('/colours');
const { FillDescriptor, GradientFill, GradientFillType, BlendMode } = require('/fills');
const { Rectangle, Transform } = require('/geometry');
const { ShapeRectangle, ShapeCornerType } = require('/shapes');
const { ShapeNodeDefinition, ArtTextNodeDefinition, NodeChildType } = require('/nodes');
const { DocumentCommand, AddChildNodesCommandBuilder } = require('/commands');
const { StoryBuilder } = require('/storybuilder');
const { StoryDelta, GlyphAttDoubleType } = require('/storydelta');
const { ParagraphAlignXType } = require('/paragraphatts');
const { FontWeight } = require('/fonts');
const { Selection } = require('/selections');

let doc = null;
for (const d of app.documents.all) if (String(d.path).endsWith('Signatures.af')) doc = d;
if (!doc) throw new Error('Signatures.af is not open');
doc.units = UnitType.Pixel;

const sp = doc.spreads.first;
const FONT = 'Segoe UI';

// Segoe UI vertical metrics (unitsPerEm 2048, hhea ascender 2210, descender -514).
// Lets us convert CSS block flow -> ArtText baselines instead of eyeballing.
const ASC = 2210 / 2048, DESC = 514 / 2048, NLH = ASC + DESC;
const base = (top, fs, lineHeight) => {
    const L = lineHeight || fs * NLH;
    return top + (L - fs * NLH) / 2 + fs * ASC;
};

const hex = (h, a) => RGBA8((h >> 16) & 255, (h >> 8) & 255, h & 255, a === undefined ? 255 : a);
const solid = (h) => FillDescriptor.createSolid(hex(h), BlendMode.Normal);

// Brand gradient: cyan -> violet(55%) -> magenta.
const BRAND = () => [
    { colour: hex(0x00b8d4), position: 0.0, midpoint: 0.5 },
    { colour: hex(0x4300c0), position: 0.55, midpoint: 0.5 },
    { colour: hex(0xc81e9b), position: 1.0, midpoint: 0.5 },
];
const gfill = () => GradientFill.create(Gradient.create(BRAND()), GradientFillType.Linear);
// Gradient maps to a 1x1 unit square; the transform stretches it onto the rect.
const gradH = (x, y, w, h) => FillDescriptor.create(gfill(), false,
    Transform.createTranslate(x, y).multiply(Transform.createScale(w, h)), BlendMode.Normal, false);
const gradV = (x, y, w, h) => FillDescriptor.create(gfill(), false,
    Transform.createTranslate(x, y).multiply(Transform.createRotate(Math.PI / 2)).multiply(Transform.createScale(h, w)),
    BlendMode.Normal, false);

const LEGAL = 'Arkanis Corporation OÜ · Reg. 17547607 · Ahtri tn 12, 15551 Tallinn, Estonia';
const SITE = 'arkanis.cc';
const FOUNDERS = [
    { key: 'Delta', name: 'Merlin “Delta” Brandes', role: 'FOUNDER · VISION & CHAOS', email: 'delta@arkanis.cc' },
    { key: 'KronnY', name: 'Daniel “KronnY” Dolejška', role: 'FOUNDER · FOCUS & DIRECTION', email: 'kronny@arkanis.cc' },
];

// ---- reset ----
{
    const kids = [...sp.children];
    if (kids.length) {
        const sel = Selection.create(doc);
        for (const k of kids) sel.addNode(k);
        doc.executeCommand(DocumentCommand.createSetSelection(sel));
        doc.executeCommand(DocumentCommand.createDeleteSelection(doc.selection));
    }
}

// ---- primitives ----
function addArtboard(x, y, w, h, name) {
    const def = ShapeNodeDefinition.createDefault();
    def.shape = ShapeRectangle.create();
    def.setBoundingRectangle(new Rectangle(x, y, w, h));
    def.setUserDescription(name);
    doc.executeCommand(DocumentCommand.createAddArtboard(def));
    let last = null;
    for (const a of sp.artboards) last = a;
    return last.node;
}

function put(def, target) {
    const b = AddChildNodesCommandBuilder.create();
    b.addNode(def);
    b.setInsertionTarget(target);
    doc.executeCommand(b.createCommand(false, NodeChildType.Main));
}

function rect(x, y, w, h, fill, name, radius) {
    const shp = ShapeRectangle.create();
    if (radius) {
        shp.setAbsoluteSizes(true, w, h);
        shp.useSingleRadius = true;
        for (const c of [shp.topLeft, shp.topRight, shp.bottomLeft, shp.bottomRight]) {
            c.cornerType = ShapeCornerType.Round;
            c.setRadius(radius, w, h);
        }
    }
    const def = ShapeNodeDefinition.createDefault();
    def.shape = shp;
    def.setBoundingRectangle(new Rectangle(x, y, w, h));
    def.addBrushFillDescriptor(fill);
    def.setUserDescription(name);
    return def;
}

// One ArtText node per line: keeps every string individually selectable/editable.
// runs = [{text, fs, colour, bold, semi, ls}] so a line can mix colours (e.g. link + separator).
// ls is in EM (matches CSS letter-spacing em values), not pixels - CharacterSpacing is em-based.
function textRuns(x, y, runs, o) {
    o = o || {};
    const sb = StoryBuilder.create();
    sb.setToArtisticTextDefaultStyle(doc.dpi, doc.format);
    if (o.align) sb.applyParagraphDelta(StoryDelta.createAlignX(o.align));
    for (const r of runs) {
        sb.applyGlyphDelta(StoryDelta.createComposite([
            StoryDelta.createFamilyName(FONT),
            StoryDelta.createWeight(r.bold ? FontWeight.Bold : r.semi ? FontWeight.SemiBold : FontWeight.Normal),
            StoryDelta.createGlyphDouble(GlyphAttDoubleType.Height, r.fs),
            StoryDelta.createBrushFill(solid(r.colour)),
            StoryDelta.createGlyphDouble(GlyphAttDoubleType.CharacterSpacing, r.ls || 0),
        ]));
        sb.addText(r.text);
    }
    const def = ArtTextNodeDefinition.createFromStoryBuilder({ x: x, y: y }, sb);
    def.setUserDescription(o.name || 'Text');
    return def;
}
const text = (x, y, str, o) => textRuns(x, y, [{ text: str, fs: o.fs, colour: o.colour, bold: o.bold, semi: o.semi, ls: o.ls }], o);

const SEAL = (n) => 'SEAL-PLACEHOLDER ' + n;
const WORD = (n) => 'WORDMARK-PLACEHOLDER ' + n;

// ---- variants ----
// A1: 520 card, seal top-left. padding 24/28/20, content x=28 w=464.
function buildA1(ox, oy, f) {
    const W = 520, H = 273, X = 28, CW = 464;
    const ab = addArtboard(ox, oy, W, H, 'A1 Sealed Card star-left — ' + f.key);
    put(rect(ox, oy, W, H, solid(0x0e0e0f), 'Card', 14), ab);
    put(rect(ox + X, oy + 24, 42, 42, solid(0x241f36), SEAL('42x42')), ab);
    put(rect(ox + X + 60, oy + 27.5, 196, 35, solid(0x241f36), WORD('196x35')), ab);
    put(rect(ox + X, oy + 82, CW, 2, gradH(ox + X, oy + 82, CW, 2), 'Hairline'), ab);
    put(text(ox + X, oy + base(102, 18), f.name, { fs: 18, bold: true, colour: 0xffffff, ls: 0.005, name: 'Name' }), ab);
    put(text(ox + X, oy + base(131.94, 11), f.role, { fs: 11, semi: true, colour: 0x38ffff, ls: 0.22, name: 'Role' }), ab);
    put(text(ox + X, oy + base(160.57, 13, 22.75), f.email, { fs: 13, colour: 0x38ffff, name: 'Email' }), ab);
    put(text(ox + X, oy + base(183.32, 13, 22.75), SITE, { fs: 13, colour: 0xa7a2ba, name: 'Site' }), ab);
    put(rect(ox + X, oy + 224.07, CW, 1, solid(0x241f36), 'Divider'), ab);
    put(text(ox + X, oy + base(237.07, 10, 16), LEGAL, { fs: 10, colour: 0x6f6a86, name: 'Legal' }), ab);
    return H;
}

// A2: same card, wordmark-only header, 80px seal right of the name block.
function buildA2(ox, oy, f) {
    const W = 520, H = 269, X = 28, CW = 464;
    const ab = addArtboard(ox, oy, W, H, 'A2 Sealed Card star-right — ' + f.key);
    put(rect(ox, oy, W, H, solid(0x0e0e0f), 'Card', 14), ab);
    put(rect(ox + X, oy + 24, 210, 38, solid(0x241f36), WORD('210x38')), ab);
    put(rect(ox + X, oy + 78, CW, 2, gradH(ox + X, oy + 78, CW, 2), 'Hairline'), ab);
    put(text(ox + X, oy + base(98, 18), f.name, { fs: 18, bold: true, colour: 0xffffff, ls: 0.005, name: 'Name' }), ab);
    put(text(ox + X, oy + base(127.94, 11), f.role, { fs: 11, semi: true, colour: 0x38ffff, ls: 0.22, name: 'Role' }), ab);
    put(text(ox + X, oy + base(156.57, 13, 22.75), f.email, { fs: 13, colour: 0x38ffff, name: 'Email' }), ab);
    put(text(ox + X, oy + base(179.32, 13, 22.75), SITE, { fs: 13, colour: 0xa7a2ba, name: 'Site' }), ab);
    put(rect(ox + X + CW - 80, oy + 98, 80, 80, solid(0x241f36), SEAL('80x80')), ab);
    put(rect(ox + X, oy + 220.07, CW, 1, solid(0x241f36), 'Divider'), ab);
    put(text(ox + X, oy + base(233.07, 10, 16), LEGAL, { fs: 10, colour: 0x6f6a86, name: 'Legal' }), ab);
    return H;
}

// B: white contact block w/ gradient spine, then dark rounded band w/ right-aligned legal.
function buildB(ox, oy, f) {
    const W = 480, ROW1 = 73.68, BANDY = 87.68, BANDH = 58, H = 146;
    const cx = 21;
    const ab = addArtboard(ox, oy, W, H, 'B Letterhead — ' + f.key);
    put(rect(ox, oy, 3, ROW1, gradV(ox, oy, 3, ROW1), 'Spine'), ab);
    put(text(ox + cx, oy + base(0, 17), f.name, { fs: 17, bold: true, colour: 0x141218, ls: 0.005, name: 'Name' }), ab);
    put(text(ox + cx, oy + base(27.61, 10.5), f.role, { fs: 10.5, semi: true, colour: 0x6a6577, ls: 0.2, name: 'Role' }), ab);
    put(textRuns(ox + cx, oy + base(51.58, 13, 22.1), [
        { text: f.email, fs: 13, colour: 0x0015ca, semi: true },
        { text: '  ·  ', fs: 13, colour: 0x3a3746 },
        { text: SITE, fs: 13, colour: 0x4300c0 },
    ], { name: 'Contact' }), ab);
    put(rect(ox, oy + BANDY, W, BANDH, solid(0x0e0e0f), 'Band', 8), ab);
    put(rect(ox + 20, oy + 99.68, 34, 34, solid(0x241f36), SEAL('34x34')), ab);
    put(rect(ox + 68, oy + 103.18, 150, 27, solid(0x241f36), WORD('150x27')), ab);
    const R = ParagraphAlignXType.Right;
    const legal = ['Arkanis Corporation OÜ', 'Reg. 17547607', 'Ahtri tn 12, 15551 Tallinn, Estonia'];
    const tops = [94.59, 109.315, 124.04];
    for (let i = 0; i < 3; i++) {
        put(text(ox + W - 20, oy + base(tops[i], 9.5, 14.725), legal[i],
            { fs: 9.5, colour: 0x8580a0, align: R, name: 'Legal ' + (i + 1) }), ab);
    }
    return H;
}

// C / D: monogram. C = 2px neutral hairline, D = 3px brand gradient spine.
function buildMono(ox, oy, f, gradient) {
    const W = 420, H = 88;
    const sw = gradient ? 3 : 2;
    const cx = sw + 18;
    const ab = addArtboard(ox, oy, W, H, (gradient ? 'D Monogram gradient — ' : 'C Monogram — ') + f.key);
    put(rect(ox, oy, sw, 87.13, gradient ? gradV(ox, oy, sw, 87.13) : solid(0xe0dcea), 'Spine'), ab);
    put(text(ox + cx, oy + base(0, 15), f.name, { fs: 15, bold: true, colour: 0x141218, name: 'Name' }), ab);
    put(text(ox + cx, oy + base(23.95, 10), f.role, { fs: 10, semi: true, colour: 0x6a6577, ls: 0.18, name: 'Role' }), ab);
    put(textRuns(ox + cx, oy + base(45.25, 12.5, 20.625), [
        { text: f.email, fs: 12.5, colour: 0x0015ca, semi: true },
        { text: '  ·  ', fs: 12.5, colour: 0x3a3746 },
        { text: SITE, fs: 12.5, colour: 0x4300c0 },
    ], { name: 'Contact' }), ab);
    put(text(ox + cx, oy + base(72.88, 9.5, 14.25), LEGAL, { fs: 9.5, colour: 0x9a95a8, name: 'Legal' }), ab);
    return H;
}

// ---- grid: columns = founders, rows = variants ----
const COLX = [0, 600];
const GAP = 80;
const ROWS = [buildA1, buildA2, buildB, (ox, oy, f) => buildMono(ox, oy, f, false), (ox, oy, f) => buildMono(ox, oy, f, true)];

let y = 0;
for (const row of ROWS) {
    let h = 0;
    for (let c = 0; c < FOUNDERS.length; c++) h = Math.max(h, row(COLX[c], y, FOUNDERS[c]));
    y += h + GAP;
}

doc.save();
console.log('built artboards:', sp.artboardCount, '| saved ->', doc.path);
for (const a of sp.artboards) console.log('  -', a.description);
