#!/usr/bin/env python3
"""
fenestra_atlas.py — the interior-mapping atlases for FIRST SLICE.

Generates TWO original, palette-anchored textures for the fenestra window
system (web-three/src/world/fenestraMaterial.ts):

  rooms.png   8x4 grid (32 cells, 256 px/cell, 2048x1024, sRGB)
              cells 0-15  residential interiors
              cells 16-31 commercial / service interiors
  fronts.png  4x4 grid (16 cells, 256 px/cell, 1024x1024, sRGB + alpha)
              curtains / blinds / AC units / glass tints

Art direction: Doc 04 — cozy, colorful, readable low-poly New York. Rooms
are drawn as one-point-perspective boxes whose projection matches the
shader's math exactly (the reference camera sits on-axis at
camDist = backScale*depth/(1-backScale); the back wall fills the center
`bs` fraction of the cell; the margins are the walls in perspective).
The rooms are PRE-LIT — the shader treats interior pixels as already-lit
and multiplies by the window's light state (day shade / lamp on / dark).

Everything is deterministic (mulberry32 seeds): a rebuild is pixel-identical.
Provenance: technique after Joost van Dongen's interior mapping (2008) and
codedgar/three-fenestra's atlas format (MIT); every pixel here is generated
by this program — no third-party artwork is embedded.
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

# ---------------------------------------------------------------- constants --
CELL = 256
ROOMS_COLS, ROOMS_ROWS = 8, 4
FRONT_COLS, FRONT_ROWS = 4, 4
BS = 0.66          # the shader's backScale contract
DEPTH = 1.0        # the shader's room-depth contract (plane-local units)

# Doc 04 palette (web-three/src/core/palette.ts) — the only color canon.
PAL = {
    'gold':    (0xF7, 0xB3, 0x2B),
    'brick':   (0xB2, 0x3A, 0x48),
    'teal':    (0x2A, 0x9D, 0x8F),
    'amber':   (0xFF, 0xB8, 0x5C),
    'stone':   (0xE8, 0xE4, 0xDC),
    'plum':    (0x6D, 0x4C, 0x7D),
    'coral':   (0xFF, 0x6B, 0x6B),
    'cream':   (0xFF, 0xF8, 0xF0),
    'ink':     (0x3A, 0x34, 0x40),
    'road':    (0x4A, 0x45, 0x52),
    'bldg':    (0x8E, 0x6F, 0x66),
    'bldg2':   (0xA3, 0x85, 0x7A),
    'interior':(0xD9, 0xC3, 0xA5),
    'taxi':    (0xF2, 0xC2, 0x30),
    'windowDim':(0x3B, 0x33, 0x46),
}

def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return rnd

def shade(c, k):
    """Multiply a palette color by k (k>1 lightens toward cream, k<1 darkens)."""
    if k <= 1.0:
        return tuple(max(0, min(255, round(v * k))) for v in c)
    return tuple(max(0, min(255, round(v + (255 - v) * min(1.0, (k - 1.0) * 0.9)))) for v in c)

def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# ------------------------------------------------------------ the projection --
# Room coords: x in [-0.5,0.5] across, y in [-0.5,0.5] up, t in [0,1] with
# t=0 the window plane and t=1 the back wall.  k(t) = bs/(bs + t*(1-bs)).
def k_of(t):
    return BS / (BS + t * (1.0 - BS))

def proj(x, y, t):
    k = k_of(t)
    return (0.5 + x * k, 0.5 + y * k)   # GL frame coords, v up (y=-0.5 floor → v bottom)

def px(uv, cell):
    return (uv[0] * cell, (1.0 - uv[1]) * cell)

def quad_pts(p0, p1, p2, p3, cell):
    return [px(p, cell) for p in (p0, p1, p2, p3)]

# ---------------------------------------------------------------- primitives --
class Room:
    """One atlas cell — a one-point-perspective room painter."""
    # furniture zoom: pieces anchor to the floor line and read larger (the
    # window crop hides small silhouettes at street distance)
    ZX, ZY = 1.26, 1.30

    def _zoom(self, x, y):
        x = max(-0.5, min(0.5, x * self.ZX))
        y = min(0.5, -0.5 + (y + 0.5) * self.ZY)
        return x, y

    def __init__(self, cell_px, rng, wall, floor_kind='wood', ceil=None,
                 warm=1.0, glow=(0.0, 0.18, 1.0), glow_r=0.85, glow_c=None):
        self.S = cell_px
        self.rng = rng
        self.img = Image.new('RGB', (cell_px, cell_px), (0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.wall = wall
        self.ceil = ceil if ceil else shade(wall, 0.82)
        self.floor_kind = floor_kind
        self.warm = warm
        self.glow = glow            # (x, y_from_floor_up_frac_along_back, t-depth) lamp anchor
        self.glow_r = glow_r
        self.glow_c = glow_c if glow_c else PAL['amber']
        self.b0 = 0.5 - BS / 2      # back-wall frame bounds
        self.b1 = 0.5 + BS / 2

    # -- shell -------------------------------------------------------------
    def draw_shell(self):
        S = self.S
        b0, b1 = self.b0, self.b1
        fl = self.floor_kind
        # base fills (margins first, the back wall covers its square after)
        ceil_col = shade(self.ceil, 0.9)
        floor_col = {'wood': (0x6B, 0x4F, 0x3A), 'tile': (0x9A, 0x94, 0x8A),
                     'checker': (0xC9, 0xC2, 0xB4), 'concrete': (0x8A, 0x84, 0x7C),
                     'dark': (0x4A, 0x40, 0x46)}[fl]
        wall_side = shade(self.wall, 0.74)
        wall_hi = shade(self.wall, 1.06)
        # ceiling (top margin trapezoid), floor (bottom), side walls
        self.d.polygon(quad_pts(proj(-0.5, 0.5, 0), proj(0.5, 0.5, 0),
                                proj(0.5, 0.5, 1), proj(-0.5, 0.5, 1), S), fill=shade(ceil_col, 1.0))
        self.d.polygon(quad_pts(proj(-0.5, -0.5, 0), proj(0.5, -0.5, 0),
                                proj(0.5, -0.5, 1), proj(-0.5, -0.5, 1), S), fill=floor_col)
        self.d.polygon(quad_pts(proj(-0.5, 0.5, 0), proj(-0.5, -0.5, 0),
                                proj(-0.5, -0.5, 1), proj(-0.5, 0.5, 1), S), fill=wall_side)
        self.d.polygon(quad_pts(proj(0.5, 0.5, 0), proj(0.5, -0.5, 0),
                                proj(0.5, -0.5, 1), proj(0.5, 0.5, 1), S), fill=shade(wall_side, 0.94))
        # the back wall
        self.d.rectangle([px((b0, b1), S), px((b1, b0), S)], fill=self.wall)
        # -- floor perspective: plank seams / checker / tiles ----------------
        if fl == 'wood':
            for i in range(1, 5):
                t = i / 5
                y = -0.5 + 0.02
                # plank rows run across; depth lines converge — draw cross seams
                a = proj(-0.5, y, t); c = proj(0.5, y, t)
                self.d.line([px(a, S), px(c, S)], fill=shade(floor_col, 0.88), width=1)
            for i in range(-2, 3):
                xw = i / 5
                a = proj(xw, -0.5, 0); c = proj(xw, -0.5, 1)
                self.d.line([px(a, S), px(c, S)], fill=shade(floor_col, 0.92), width=1)
        elif fl == 'checker':
            n = 4
            for i in range(n):
                for j in range(n):
                    if (i + j) % 2:
                        continue
                    t0, t1 = i / n, (i + 1) / n
                    x0, x1 = -0.5 + j / n, -0.5 + (j + 1) / n
                    self.d.polygon(quad_pts(
                        proj(x0, -0.5, t0), proj(x1, -0.5, t0),
                        proj(x1, -0.5, t1), proj(x0, -0.5, t1), S),
                        fill=shade((0x3E, 0x38, 0x44), 1.0))
        elif fl == 'tile':
            for i in range(1, 5):
                t = i / 5
                self.d.line([px(proj(-0.5, -0.5 + 0.01, t), S), px(proj(0.5, -0.5 + 0.01, t), S)],
                            fill=shade(floor_col, 0.88), width=1)
        # back-wall baseboard
        base_h = 0.045
        self.d.polygon(quad_pts(proj(-0.5, -0.5, 1), proj(0.5, -0.5, 1),
                                proj(0.5, -0.5 + base_h, 1), proj(-0.5, -0.5 + base_h, 1), S),
                       fill=shade(self.wall, 0.72))
        # side-wall skirting lines
        self.d.line([px(proj(-0.5, -0.5, 0), S), px(proj(-0.5, -0.5, 1), S)], fill=shade(self.wall, 0.68), width=2)
        self.d.line([px(proj(0.5, -0.5, 0), S), px(proj(0.5, -0.5, 1), S)], fill=shade(self.wall, 0.64), width=2)

    # -- furniture helpers (all flat-shaded silhouettes) -------------------
    def poly(self, pts_room, fill, outline=None, ow=1):
        S = self.S
        pts = [px(proj(*self._zoom(x, y), t), S) for (x, y, t) in pts_room]
        self.d.polygon(pts, fill=fill, outline=outline, width=ow)

    def box3(self, x0, x1, y0, y1, zb, zf, col, top_k=1.18, side_k=0.88):
        """An axis-aligned volume: front face + visible top + one side, shaded."""
        x0, y0 = self._zoom(x0, y0)
        x1, y1 = self._zoom(x1, y1)
        self.poly([(x0, y1, zf), (x1, y1, zf), (x1, y0, zf), (x0, y0, zf)], fill=col)          # front
        self.poly([(x0, y1, zb), (x1, y1, zb), (x1, y1, zf), (x0, y1, zf)], fill=shade(col, top_k))  # top
        side = shade(col, side_k)
        if x1 <= 0:
            self.poly([(x1, y1, zb), (x1, y0, zb), (x1, y0, zf), (x1, y1, zf)], fill=side)
        else:
            self.poly([(x0, y1, zb), (x0, y0, zb), (x0, y0, zf), (x0, y1, zf)], fill=side)

    def contact(self, x0, x1, zb, zf, k=0.62):
        """Soft contact shadow under a piece (the thing that grounds it)."""
        S = self.S
        sh = (0, 0, 0)
        a = 70
        pts = [px(proj(x, -0.499, t), S) for (x, t) in
               [(x0 - 0.03, zb + 0.04), (x1 + 0.03, zb + 0.04), (x1 + 0.06, zf), (x0 - 0.06, zf)]]
        lay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(lay).polygon(pts, fill=(*sh, 95))
        lay = lay.filter(ImageFilter.GaussianBlur(3))
        self.img = Image.alpha_composite(self.img.convert('RGBA'), lay).convert('RGB')
        self.d = ImageDraw.Draw(self.img)

    def lamp_glow(self):
        """The room's light: a radial warm wash centered on the lamp anchor."""
        gx, gy, gt = self.glow
        k = k_of(gt)
        cx, cy = px((0.5 + gx * k, 0.5 + (-0.5 + gy) * k), self.S)
        r = self.glow_r * self.S * (0.42 + 0.36 * k) * 0.8
        glow = Image.new('RGB', (self.S, self.S), (0, 0, 0))
        gd = ImageDraw.Draw(glow)
        steps = 7
        for i in range(steps, 0, -1):
            f = i / steps
            c = shade(self.glow_c, 0.16 + 0.84 * (1 - f) * 0.5 * f + 0.42 * (1 - f))
            gd.ellipse([cx - r * f, cy - r * f, cx + r * f, cy + r * f], fill=c)
        glow = glow.filter(ImageFilter.GaussianBlur(self.S * 0.05))
        self.img = Image.blend(self.img, Image.blend(self.img, glow, 0.5), 0.34)
        self.d = ImageDraw.Draw(self.img)

    def vignette(self):
        """Cell-edge falloff so atlas neighbors never seam. Kept soft and
        shallow — a hard dark rim is what speckles against bright neighbors
        at the mips (see with_gutter)."""
        S = self.S
        v = Image.new('L', (S, S), 0)
        vd = ImageDraw.Draw(v)
        m = int(S * 0.055)
        vd.rectangle([0, 0, S, S], fill=255)
        vd.rectangle([m, m, S - m, S - m], fill=0)
        v = v.filter(ImageFilter.GaussianBlur(S * 0.04))
        dark = Image.new('RGB', (S, S), (12, 10, 16))
        self.img = Image.composite(dark, self.img, v.point(lambda p: int(p * 0.18)))

    def grain(self, amount=2.5):
        S = self.S
        g = Image.new('RGB', (S, S))
        gd = ImageDraw.Draw(g)
        for _ in range(int(S * S * 0.03)):
            x, y = self.rng() * S, self.rng() * S
            v = self.rng()
            gd.point((x, y), fill=(int(255 * v),) * 3)
        self.img = Image.blend(self.img, Image.blend(self.img, g, 0.5), amount / 255.0 * 8)

    def finish(self):
        self.lamp_glow()
        self.vignette()
        self.grain()
        return self.img


def with_gutter(img, g=8):
    """Edge-extend a cell by `g` px on all sides (inside the same cell box).

    The hardware mip chain cannot know where cells end — without gutters the
    high mips blend neighboring rooms into the 2-4 px speckle the probe
    caught on real facades. The outer `g` px of every cell are now
    replications of the cell's own border colors, so bleeding stays
    within-tone at every mip. The shader's 0.001 UV inset samples just
    inside; the room reads ~6% larger (imperceptible)."""
    S = img.size[0]
    mode = img.mode
    out = Image.new(mode, (S, S), (0, 0, 0, 0) if mode == 'RGBA' else (0, 0, 0))
    core = img.crop((g, g, S - g, S - g))
    cw = S - 2 * g
    out.paste(core, (g, g))
    # four edge strips (stretched border rows/cols of the core)
    out.paste(core.crop((0, 0, cw, 1)).resize((cw, g), Image.NEAREST), (g, 0))
    out.paste(core.crop((0, cw - 1, cw, cw)).resize((cw, g), Image.NEAREST), (g, S - g))
    out.paste(core.crop((0, 0, 1, cw)).resize((g, cw), Image.NEAREST), (0, g))
    out.paste(core.crop((cw - 1, 0, cw, cw)).resize((g, cw), Image.NEAREST), (S - g, g))
    # four corner squares (the core's corner pixel, stretched)
    out.paste(core.crop((0, 0, 1, 1)).resize((g, g), Image.NEAREST), (0, 0))
    out.paste(core.crop((cw - 1, 0, cw, 1)).resize((g, g), Image.NEAREST), (S - g, 0))
    out.paste(core.crop((0, cw - 1, 1, cw)).resize((g, g), Image.NEAREST), (0, S - g))
    out.paste(core.crop((cw - 1, cw - 1, cw, cw)).resize((g, g), Image.NEAREST), (S - g, S - g))
    return out


# ================================================================ room set ====
# Every room is a function(room) painting furniture in back-to-front order.
# Coordinates: x across [-0.5,0.5], y up from floor -0.5..ceiling 0.5,
# t depth 0 (window) .. 1 (back wall). The back wall is the canvas at t=1.

def r_living(r):
    w = r.wall
    # window on the back wall (the room's own far window, dark street beyond)
    r.poly([(-0.30, 0.22, 1), (-0.06, 0.22, 1), (-0.06, -0.02, 1), (-0.30, -0.02, 1)], fill=(0x2E, 0x2A, 0x3C))
    r.poly([(-0.32, 0.24, 1), (-0.04, 0.24, 1), (-0.04, -0.04, 1), (-0.32, -0.04, 1)], fill=shade(PAL['cream'], 0.9), ow=2)
    # radiator under it (the NYC tell)
    r.box3(-0.31, -0.05, -0.34, -0.18, 0.97, 0.90, shade(PAL['stone'], 0.62))
    for i in range(7):
        x = -0.29 + i * 0.034
        r.poly([(x, -0.30, 0.93), (x + 0.014, -0.30, 0.93), (x + 0.014, -0.20, 0.93), (x, -0.20, 0.93)],
               fill=shade(PAL['stone'], 0.5))
    # couch
    r.contact(-0.16, 0.30, 0.80, 0.62)
    r.box3(-0.16, 0.30, -0.16, 0.02, 0.80, 0.60, PAL['teal'])
    r.box3(-0.16, 0.30, 0.02, 0.22, 0.86, 0.82, shade(PAL['teal'], 1.12))
    # cushions
    r.poly([(-0.12, 0.18, 0.62), (-0.02, 0.18, 0.62), (-0.02, 0.04, 0.62), (-0.12, 0.04, 0.62)], fill=shade(PAL['teal'], 1.25))
    r.poly([(0.04, 0.18, 0.62), (0.14, 0.18, 0.62), (0.14, 0.04, 0.62), (0.04, 0.04, 0.62)], fill=shade(PAL['gold'], 0.9))
    # TV on the right, screen glow
    r.box3(0.34, 0.50, 0.10, 0.42, 0.94, 0.90, PAL['ink'])
    r.poly([(0.355, 0.38, 0.92), (0.485, 0.38, 0.92), (0.485, 0.14, 0.92), (0.355, 0.14, 0.92)],
           fill=mix((0x8F, 0xB8, 0xCF), (255, 255, 255), 0.25))
    # plant left
    r.contact(-0.46, -0.34, 0.86, 0.72)
    r.poly([(-0.44, -0.26, 0.86), (-0.36, -0.26, 0.86), (-0.37, -0.38, 0.86), (-0.43, -0.38, 0.86)], fill=shade(PAL['brick'], 0.85))
    for a in (-0.4, -0.35, -0.3):
        r.poly([(a, 0.05, 0.85), (a + 0.05, -0.02, 0.85), (a + 0.02, -0.28, 0.85)], fill=(0x5D, 0x7D, 0x4A))
    # rug
    r.poly([(-0.2, -0.34, 0.45), (0.24, -0.34, 0.45), (0.3, -0.42, 0.3), (-0.26, -0.42, 0.3)], fill=shade(PAL['plum'], 1.15))
    # floor lamp
    r.poly([(-0.47, 0.30, 0.5), (-0.44, 0.30, 0.5), (-0.445, -0.42, 0.5), (-0.465, -0.42, 0.5)], fill=PAL['ink'])
    r.poly([(-0.49, 0.38, 0.5), (-0.42, 0.38, 0.5), (-0.42, 0.30, 0.5), (-0.49, 0.30, 0.5)], fill=PAL['amber'])

def r_parlor(r):
    # brownstone parlor: fireplace + mantel + tall mirror, warm
    r.poly([(-0.46, 0.34, 1), (0.46, 0.34, 1), (0.46, -0.5, 1), (-0.46, -0.5, 1)], fill=r.wall)
    r.box3(-0.14, 0.14, -0.5, 0.06, 1.0, 0.97, shade(PAL['stone'], 0.8))   # mantel mass
    r.poly([(-0.16, 0.10, 0.97), (0.16, 0.10, 0.97), (0.16, 0.02, 0.97), (-0.16, 0.02, 0.97)], fill=PAL['stone'])
    r.poly([(-0.10, -0.04, 0.985), (0.10, -0.04, 0.985), (0.10, -0.5, 0.985), (-0.10, -0.5, 0.985)], fill=(0x2A, 0x22, 0x2C))
    r.poly([(-0.07, -0.16, 0.985), (0.07, -0.16, 0.985), (0.07, -0.42, 0.985), (-0.07, -0.42, 0.985)], fill=mix(PAL['coral'], (255, 200, 90), 0.55))
    # tall mirror right (brownstone parlors wear one)
    r.poly([(0.30, 0.42, 1), (0.44, 0.42, 1), (0.44, -0.10, 1), (0.30, -0.10, 1)], fill=shade(PAL['gold'], 0.7), ow=2)
    r.poly([(0.315, 0.395, 1), (0.425, 0.395, 1), (0.425, -0.075, 1), (0.315, -0.075, 1)], fill=(0xB9, 0xC4, 0xC9))
    # armchair
    r.contact(-0.42, -0.14, 0.78, 0.58)
    r.box3(-0.42, -0.14, -0.14, 0.10, 0.78, 0.58, shade(PAL['brick'], 0.9))
    r.poly([(-0.40, 0.06, 0.60), (-0.16, 0.06, 0.60), (-0.16, -0.12, 0.60), (-0.40, -0.12, 0.60)], fill=shade(PAL['brick'], 1.2))
    # small table + vase
    r.box3(0.16, 0.28, -0.26, -0.12, 0.72, 0.62, shade(PAL['bldg'], 0.8))
    r.poly([(0.20, 0.0, 0.64), (0.24, 0.0, 0.64), (0.23, 0.12, 0.64), (0.21, 0.12, 0.64)], fill=PAL['teal'])
    # rug
    r.poly([(-0.34, -0.44, 0.42), (0.34, -0.44, 0.42), (0.4, -0.5, 0.26), (-0.4, -0.5, 0.26)], fill=shade(PAL['plum'], 1.2))
    # picture rail
    r.poly([(-0.46, 0.46, 1), (0.46, 0.46, 1), (0.46, 0.42, 1), (-0.46, 0.42, 1)], fill=shade(PAL['gold'], 0.8))

def r_studio(r):
    # bed left, desk right with laptop glow
    r.contact(-0.48, -0.06, 0.82, 0.55)
    r.box3(-0.48, -0.06, -0.28, -0.06, 0.82, 0.55, shade(PAL['stone'], 0.92))
    r.poly([(-0.47, -0.055, 0.58), (-0.07, -0.055, 0.58), (-0.07, -0.24, 0.58), (-0.47, -0.24, 0.58)], fill=PAL['plum'])
    r.poly([(-0.47, -0.06, 0.62), (-0.47, -0.06, 0.62), (-0.2, -0.28, 0.62)], fill=shade(PAL['cream'], 0.95))
    r.poly([(-0.44, -0.10, 0.60), (-0.30, -0.16, 0.60), (-0.28, -0.24, 0.60), (-0.42, -0.20, 0.60)], fill=shade(PAL['cream'], 1.0))
    # pillow
    r.poly([(-0.44, -0.10, 0.70), (-0.28, -0.10, 0.70), (-0.28, -0.22, 0.70), (-0.44, -0.22, 0.70)], fill=PAL['cream'])
    # desk + laptop
    r.box3(0.14, 0.48, -0.22, -0.02, 0.80, 0.68, shade(PAL['bldg2'], 0.85))
    r.poly([(0.24, 0.06, 0.72), (0.38, 0.06, 0.72), (0.38, -0.02, 0.72), (0.24, -0.02, 0.72)], fill=PAL['ink'])
    r.poly([(0.25, 0.045, 0.715), (0.37, 0.045, 0.715), (0.37, 0.0, 0.715), (0.25, 0.0, 0.715)], fill=(0x9F, 0xC4, 0xD8))
    r.box3(0.40, 0.47, -0.02, 0.12, 0.80, 0.76, shade(PAL['ink'], 1.3))    # mug/box
    # poster wall
    r.poly([(0.06, 0.36, 1), (0.20, 0.36, 1), (0.20, 0.16, 1), (0.06, 0.16, 1)], fill=PAL['coral'])
    r.poly([(-0.34, 0.40, 1), (-0.16, 0.40, 1), (-0.16, 0.24, 1), (-0.34, 0.24, 1)], fill=PAL['teal'])
    # radiator + window hint
    r.box3(-0.05, 0.05, -0.5, -0.36, 1.0, 0.97, shade(PAL['stone'], 0.6))

def r_kitchen(r):
    # counter run along the back + upper cabinets + fridge right
    r.box3(-0.5, 0.30, -0.24, 0.02, 1.0, 0.90, shade(PAL['teal'], 0.78))       # lower cabinets
    r.poly([(-0.5, 0.03, 0.90), (0.30, 0.03, 0.90), (0.30, -0.06, 0.90), (-0.5, -0.06, 0.90)], fill=shade(PAL['stone'], 1.05))  # counter top
    r.box3(-0.5, 0.30, 0.34, 0.52, 1.0, 0.95, shade(PAL['teal'], 0.9))         # upper cabinets
    for i in range(5):
        x = -0.46 + i * 0.155
        r.poly([(x, 0.36, 0.96), (x + 0.13, 0.36, 0.96), (x + 0.13, 0.50, 0.96), (x, 0.50, 0.96)],
               fill=shade(PAL['teal'], 0.95), outline=shade(PAL['teal'], 0.5), ow=1)
    # range + hood glow
    r.poly([(-0.10, 0.028, 0.9), (0.06, 0.028, 0.9), (0.06, -0.14, 0.9), (-0.10, -0.14, 0.9)], fill=PAL['ink'])
    # fridge
    r.box3(0.32, 0.5, -0.28, 0.34, 1.0, 0.96, shade(PAL['cream'], 0.9))
    r.poly([(0.35, 0.30, 0.94), (0.36, 0.30, 0.94), (0.36, -0.10, 0.94), (0.35, -0.10, 0.94)], fill=shade(PAL['cream'], 0.6))
    # under-cabinet warm strip
    r.poly([(-0.5, 0.335, 0.955), (0.30, 0.335, 0.955), (0.30, 0.30, 0.955), (-0.5, 0.30, 0.955)], fill=PAL['gold'])

def r_bedroom(r):
    r.contact(-0.34, 0.22, 0.80, 0.5)
    r.box3(-0.34, 0.22, -0.30, -0.04, 0.80, 0.50, shade(PAL['bldg2'], 0.9))    # bed
    r.poly([(-0.33, -0.06, 0.53), (0.21, -0.06, 0.53), (0.21, -0.26, 0.53), (-0.33, -0.26, 0.53)], fill=PAL['plum'])     # blanket
    r.poly([(-0.32, -0.10, 0.66), (-0.14, -0.10, 0.66), (-0.14, -0.24, 0.66), (-0.32, -0.24, 0.66)], fill=PAL['cream']) # pillow
    r.poly([(-0.34, 0.06, 0.60), (0.22, 0.06, 0.60), (0.22, 0.02, 0.60), (-0.34, 0.02, 0.60)], fill=shade(PAL['bldg2'], 0.7))  # headboard
    # nightstand + lamp (the glow anchor)
    r.box3(0.30, 0.44, -0.28, -0.10, 0.72, 0.62, shade(PAL['bldg'], 0.85))
    r.poly([(0.355, 0.02, 0.64), (0.385, 0.02, 0.64), (0.385, 0.14, 0.64), (0.355, 0.14, 0.64)], fill=PAL['ink'])
    r.poly([(0.33, 0.22, 0.64), (0.41, 0.22, 0.64), (0.41, 0.10, 0.64), (0.33, 0.10, 0.64)], fill=PAL['amber'])
    r.glow = (0.37, 0.62, 0.64)
    r.glow_r = 0.8
    # curtained window back wall
    r.poly([(-0.36, 0.36, 1), (0.02, 0.36, 1), (0.02, -0.06, 1), (-0.36, -0.06, 1)], fill=(0x2E, 0x2A, 0x3C))
    r.poly([(-0.38, 0.39, 1), (0.04, 0.39, 1), (0.04, -0.09, 1), (-0.38, -0.09, 1)], fill=shade(PAL['stone'], 0.85), ow=2)
    r.poly([(-0.05, 0.39, 0.99), (0.04, 0.39, 0.99), (0.04, -0.09, 0.99), (-0.05, -0.09, 0.99)], fill=shade(PAL['coral'], 0.75))  # curtain
    # dresser left
    r.box3(-0.5, -0.40, -0.20, 0.06, 1.0, 0.94, shade(PAL['bldg'], 0.9))

def r_kid(r):
    # bed + toy shelf + nightlight, warm
    r.contact(-0.44, 0.02, 0.72, 0.46)
    r.box3(-0.44, 0.02, -0.26, 0.0, 0.72, 0.46, shade(PAL['coral'], 0.62))
    r.poly([(-0.43, -0.04, 0.49), (0.01, -0.04, 0.49), (0.01, -0.22, 0.49), (-0.43, -0.22, 0.49)], fill=PAL['gold'])
    r.poly([(-0.42, -0.06, 0.58), (-0.28, -0.06, 0.58), (-0.28, -0.18, 0.58), (-0.42, -0.18, 0.58)], fill=PAL['cream'])
    # toy shelf on back wall
    r.box3(0.18, 0.46, -0.18, 0.36, 1.0, 0.96, shade(PAL['teal'], 0.8))
    for i, c in enumerate([PAL['coral'], PAL['gold'], PAL['teal'], PAL['plum']]):
        r.poly([(0.20 + i * 0.06, -0.02, 0.965), (0.245 + i * 0.06, -0.02, 0.965), (0.245 + i * 0.06, 0.10, 0.965), (0.20 + i * 0.06, 0.10, 0.965)], fill=shade(c, 1.05))
    # bunting
    for i in range(6):
        x = -0.4 + i * 0.14
        r.poly([(x, 0.46, 1), (x + 0.1, 0.46, 1), (x + 0.05, 0.38, 1)],
               fill=[PAL['coral'], PAL['gold'], PAL['teal']][i % 3])
    r.glow = (0.0, 0.5, 0.8)
    r.glow_r = 0.95
    r.glow_c = mix(PAL['amber'], (255, 240, 200), 0.4)

def r_dining(r):
    # table + chairs + pendant
    r.contact(-0.26, 0.26, 0.66, 0.42)
    r.poly([(-0.26, -0.08, 0.46), (0.26, -0.08, 0.46), (0.26, -0.16, 0.42), (-0.26, -0.16, 0.42)], fill=shade(PAL['bldg'], 1.05))
    r.poly([(-0.26, -0.08, 0.46), (0.26, -0.08, 0.46), (0.26, -0.14, 0.46), (-0.26, -0.14, 0.46)], fill=shade(PAL['bldg2'], 1.1))
    for cx in (-0.2, 0.0, 0.2):
        r.poly([(cx - 0.03, -0.35, 0.44), (cx + 0.03, -0.35, 0.44), (cx + 0.03, -0.10, 0.44), (cx - 0.03, -0.10, 0.44)], fill=shade(PAL['bldg'], 0.7))
    # chairs behind the table (backs visible)
    for cx in (-0.16, 0.12):
        r.poly([(cx - 0.09, 0.10, 0.56), (cx + 0.09, 0.10, 0.56), (cx + 0.09, -0.14, 0.56), (cx - 0.09, -0.14, 0.56)], fill=shade(PAL['teal'], 0.8))
    # sideboard back wall
    r.box3(-0.44, -0.10, -0.24, 0.04, 1.0, 0.95, shade(PAL['bldg'], 0.85))
    r.poly([(0.16, 0.36, 1), (0.34, 0.36, 1), (0.34, 0.18, 1), (0.16, 0.18, 1)], fill=PAL['brick'])  # art
    r.glow = (0.0, 0.78, 0.5)
    r.glow_r = 0.9
    r.glow_c = mix(PAL['amber'], (255, 244, 214), 0.35)

def r_empty(r):
    # the vacancy tell: bare bulb, moving boxes, cooler light
    r.poly([(0.5 - BS / 2 - 0.001, 0.5 + BS / 2 + 0.001, 1), (0.5 + BS / 2 + 0.001, 0.5 + BS / 2 + 0.001, 1),
            (0.5 + BS / 2 + 0.001, 0.5 - BS / 2 - 0.001, 1), (0.5 - BS / 2 - 0.001, 0.5 - BS / 2 - 0.001, 1)], fill=shade(r.wall, 0.95))
    # moving boxes
    r.box3(-0.30, -0.10, -0.34, -0.06, 0.72, 0.62, shade(PAL['bldg2'], 1.15))
    r.box3(-0.26, -0.02, -0.06, 0.16, 0.66, 0.56, shade(PAL['bldg2'], 1.05))
    r.box3(0.16, 0.40, -0.30, -0.04, 0.68, 0.58, shade(PAL['bldg2'], 1.1))
    # tape lines
    r.poly([(-0.28, -0.20, 0.64), (-0.12, -0.20, 0.64), (-0.12, -0.335, 0.64), (-0.28, -0.335, 0.64)], fill=shade(PAL['stone'], 0.55))
    # bare bulb + cord
    r.poly([(-0.005, 0.5, 0.35), (0.005, 0.5, 0.35), (0.005, 0.30, 0.35), (-0.005, 0.30, 0.35)], fill=PAL['ink'])
    r.poly([(-0.03, 0.30, 0.35), (0.03, 0.30, 0.35), (0.03, 0.24, 0.35), (-0.03, 0.24, 0.35)], fill=(255, 244, 214))
    r.glow = (0.0, 0.80, 0.35)
    r.glow_r = 1.0
    r.glow_c = mix(PAL['amber'], (255, 250, 235), 0.5)

def r_artist(r):
    # easel + canvas + paint wall, north-light cool
    r.poly([(0.5 - BS / 2 - 0.001, 0.5 + BS / 2 + 0.001, 1), (0.5 + BS / 2 + 0.001, 0.5 + BS / 2 + 0.001, 1),
            (0.5 + BS / 2 + 0.001, 0.5 - BS / 2 - 0.001, 1), (0.5 - BS / 2 - 0.001, 0.5 - BS / 2 - 0.001, 1)],
           fill=shade(r.wall, 1.0))
    # splatters on the back wall
    for _ in range(14):
        x = (r.rng() - 0.5) * 0.8
        y = -0.2 + r.rng() * 0.6
        rr = 0.008 + r.rng() * 0.02
        c = [PAL['coral'], PAL['teal'], PAL['gold'], PAL['plum']][int(r.rng() * 4)]
        p = px(proj(x, y, 1), r.S)
        r.d.ellipse([p[0] - rr * r.S, p[1] - rr * r.S, p[0] + rr * r.S, p[1] + rr * r.S], fill=shade(c, 0.85))
    # easel
    r.contact(-0.2, 0.16, 0.86, 0.6)
    r.poly([(-0.18, 0.30, 0.62), (0.14, 0.30, 0.62), (0.14, -0.30, 0.62), (-0.18, -0.30, 0.62)], fill=(0xE6, 0xDF, 0xD2))  # canvas
    r.poly([(-0.14, 0.16, 0.625), (0.06, 0.16, 0.625), (0.06, -0.10, 0.625), (-0.14, -0.10, 0.625)], fill=PAL['teal'])
    r.poly([(-0.2, 0.28, 0.64), (-0.16, 0.28, 0.64), (-0.18, -0.34, 0.64), (-0.22, -0.34, 0.64)], fill=shade(PAL['bldg'], 0.8))
    r.poly([(0.12, 0.28, 0.64), (0.16, 0.28, 0.64), (0.14, -0.34, 0.64), (0.10, -0.34, 0.64)], fill=shade(PAL['bldg'], 0.8))
    # stacked canvases right
    r.box3(0.3, 0.5, -0.34, 0.0, 0.9, 0.86, shade(PAL['stone'], 0.92))
    r.box3(0.32, 0.5, -0.30, -0.06, 0.86, 0.8, shade(PAL['stone'], 1.05))
    # supply cart
    r.box3(-0.48, -0.36, -0.30, -0.10, 0.78, 0.7, shade(PAL['ink'], 1.5))
    r.glow = (-0.4, 0.6, 0.4)
    r.glow_r = 0.95
    r.glow_c = (0xB9, 0xC8, 0xD8)

def r_books(r):
    # wall of bookshelves + reading chair + floor lamp, warm
    for sx in (-0.5, -0.18, 0.14):
        r.box3(sx, sx + 0.30, -0.10, 0.5, 1.0, 0.96, shade(PAL['bldg'], 0.75))
        for shelf in range(4):
            y0 = 0.36 - shelf * 0.155
            r.poly([(sx + 0.005, y0, 0.975), (sx + 0.295, y0, 0.975), (sx + 0.295, y0 - 0.02, 0.975), (sx + 0.005, y0 - 0.02, 0.975)],
                   fill=shade(PAL['bldg'], 0.55))
            bx = sx + 0.015
            while bx < sx + 0.28:
                bw = 0.012 + r.rng() * 0.018
                c = [PAL['brick'], PAL['teal'], PAL['gold'], PAL['plum'], PAL['bldg2'], PAL['coral']][int(r.rng() * 6)]
                r.poly([(bx, y0 - 0.02, 0.975), (bx + bw, y0 - 0.02, 0.975), (bx + bw, y0 - 0.14 + r.rng() * 0.03, 0.975), (bx, y0 - 0.13, 0.975)],
                       fill=shade(c, 0.9))
                bx += bw + 0.004
    # chair + lamp
    r.contact(0.24, 0.48, 0.76, 0.56)
    r.box3(0.24, 0.48, -0.16, 0.06, 0.76, 0.56, shade(PAL['teal'], 0.9))
    r.poly([(-0.47, 0.30, 0.4), (-0.44, 0.30, 0.4), (-0.445, -0.42, 0.4), (-0.465, -0.42, 0.4)], fill=PAL['ink'])
    r.poly([(-0.49, 0.38, 0.4), (-0.42, 0.38, 0.4), (-0.42, 0.30, 0.4), (-0.49, 0.30, 0.4)], fill=PAL['amber'])
    r.glow = (-0.455, 0.75, 0.4)
    r.glow_r = 0.85

def r_bath(r):
    # tiles + mirror + towel, cool fluorescent
    tile_a, tile_b = shade(PAL['stone'], 0.98), shade(PAL['stone'], 0.86)
    bw0, bw1 = 0.5 - BS / 2, 0.5 + BS / 2
    n = 8
    for i in range(n):
        for j in range(n):
            x0 = bw0 + (bw1 - bw0) * i / n
            x1 = bw0 + (bw1 - bw0) * (i + 1) / n
            y0 = bw0 + (bw1 - bw0) * j / n
            y1 = bw0 + (bw1 - bw0) * (j + 1) / n
            r.d.rectangle([px((x0 + 0.004, y1 - 0.004), r.S), px((x1 - 0.004, y0 + 0.004), r.S)],
                          fill=tile_a if (i + j) % 2 == 0 else tile_b)
    # mirror + sink
    r.poly([(-0.12, 0.44, 1), (0.12, 0.44, 1), (0.12, 0.10, 1), (-0.12, 0.10, 1)], fill=(0xB9, 0xC8, 0xD2), outline=shade(PAL['stone'], 0.6), ow=2)
    r.box3(-0.16, 0.16, -0.34, -0.14, 1.0, 0.96, shade(PAL['cream'], 0.95))
    r.poly([(-0.10, -0.16, 0.95), (0.10, -0.16, 0.95), (0.10, -0.22, 0.95), (-0.10, -0.22, 0.95)], fill=shade(PAL['stone'], 0.75))
    # towel rail
    r.poly([(-0.44, 0.18, 1), (-0.24, 0.18, 1), (-0.24, 0.14, 1), (-0.44, 0.14, 1)], fill=shade(PAL['stone'], 0.6))
    r.poly([(-0.42, 0.14, 1), (-0.26, 0.14, 1), (-0.26, -0.16, 1), (-0.42, -0.16, 1)], fill=PAL['teal'])
    r.glow = (0.0, 0.9, 0.55)
    r.glow_r = 1.0
    r.glow_c = (0xDD, 0xE8, 0xF2)

def r_office_home(r):
    # desk + dual monitors + corkboard, evening cool-warm mix
    r.box3(-0.06, 0.44, -0.26, -0.04, 0.82, 0.7, shade(PAL['bldg'], 0.85))
    r.poly([(0.06, 0.16, 0.72), (0.20, 0.16, 0.72), (0.20, -0.06, 0.72), (0.06, -0.06, 0.72)], fill=PAL['ink'])
    r.poly([(0.065, 0.15, 0.715), (0.195, 0.15, 0.715), (0.195, -0.05, 0.715), (0.065, -0.05, 0.715)], fill=(0x9F, 0xC4, 0xD8))
    r.poly([(0.24, 0.14, 0.72), (0.36, 0.14, 0.72), (0.36, -0.04, 0.72), (0.24, -0.04, 0.72)], fill=PAL['ink'])
    r.poly([(0.245, 0.13, 0.715), (0.355, 0.13, 0.715), (0.355, -0.03, 0.715), (0.245, -0.03, 0.715)], fill=mix((0x9F, 0xC4, 0xD8), PAL['amber'], 0.25))
    # chair back
    r.poly([(-0.02, 0.02, 0.5), (0.14, 0.02, 0.5), (0.14, -0.30, 0.5), (-0.02, -0.30, 0.5)], fill=shade(PAL['ink'], 1.4))
    # corkboard
    r.poly([(0.16, 0.46, 1), (0.44, 0.46, 1), (0.44, 0.16, 1), (0.16, 0.16, 1)], fill=shade(PAL['bldg2'], 1.25), outline=shade(PAL['bldg'], 0.7), ow=2)
    for _ in range(4):
        x = 0.19 + r.rng() * 0.2
        y = 0.20 + r.rng() * 0.18
        r.poly([(x, y + 0.08, 1), (x + 0.05, y + 0.08, 1), (x + 0.05, y, 1), (x, y, 1)], fill=shade(PAL['cream'], 0.92))
    # plant
    r.poly([(-0.4, -0.02, 0.95), (-0.32, -0.02, 0.95), (-0.34, -0.24, 0.95), (-0.38, -0.24, 0.95)], fill=shade(PAL['stone'], 0.7))
    r.poly([(-0.40, 0.16, 0.95), (-0.32, 0.10, 0.95), (-0.36, -0.22, 0.95)], fill=(0x5D, 0x7D, 0x4A))
    r.glow = (0.2, 0.6, 0.7)
    r.glow_r = 0.9
    r.glow_c = (0xD9, 0xE2, 0xEE)

def r_laundry_corner(r):
    # stacked washer/dryer + shelf, cool
    r.box3(-0.44, -0.12, -0.36, 0.24, 1.0, 0.94, shade(PAL['cream'], 0.88))
    r.poly([(-0.40, 0.16, 0.95), (-0.16, 0.16, 0.95), (-0.16, -0.08, 0.95), (-0.40, -0.08, 0.95)], fill=(0x5A, 0x64, 0x70))  # door
    r.poly([(-0.40, -0.10, 0.95), (-0.16, -0.10, 0.95), (-0.16, -0.34, 0.95), (-0.40, -0.34, 0.95)], fill=(0x5A, 0x64, 0x70))
    r.poly([(-0.36, 0.10, 0.955), (-0.20, 0.10, 0.955), (-0.20, -0.04, 0.955), (-0.36, -0.04, 0.955)], fill=(0x33, 0x3A, 0x44))
    r.poly([(-0.36, -0.14, 0.955), (-0.20, -0.14, 0.955), (-0.20, -0.28, 0.955), (-0.36, -0.28, 0.955)], fill=(0x33, 0x3A, 0x44))
    # detergent shelf
    r.box3(0.12, 0.44, 0.0, 0.20, 1.0, 0.96, shade(PAL['bldg'], 0.8))
    for i, c in enumerate([PAL['teal'], PAL['coral'], PAL['gold']]):
        r.poly([(0.16 + i * 0.09, -0.04, 0.97), (0.22 + i * 0.09, -0.04, 0.97), (0.22 + i * 0.09, 0.10, 0.97), (0.16 + i * 0.09, 0.10, 0.97)], fill=c)
    # drying rack
    r.poly([(0.1, -0.4, 0.5), (0.44, -0.4, 0.5), (0.44, -0.44, 0.5), (0.1, -0.44, 0.5)], fill=shade(PAL['stone'], 0.6))
    r.glow = (-0.28, 0.55, 0.7)
    r.glow_r = 0.95
    r.glow_c = (0xE4, 0xEA, 0xF0)

def r_hall(r):
    # entry hall: coat rack, console, dim
    r.box3(-0.10, 0.22, -0.30, -0.10, 0.9, 0.82, shade(PAL['bldg'], 0.85))     # console
    r.poly([(0.02, 0.34, 1), (0.16, 0.34, 1), (0.16, 0.06, 1), (0.02, 0.06, 1)], fill=PAL['plum'])  # art
    # coats on wall hooks
    for i, c in enumerate([PAL['brick'], PAL['ink'], PAL['teal']]):
        x = -0.4 + i * 0.13
        r.poly([(x, 0.34, 1), (x + 0.09, 0.34, 1), (x + 0.07, -0.14, 1), (x + 0.02, -0.14, 1)], fill=shade(c, 0.85))
    # shoe pile
    r.poly([(-0.06, -0.44, 0.55), (0.16, -0.44, 0.55), (0.2, -0.5, 0.4), (-0.1, -0.5, 0.4)], fill=shade(PAL['bldg2'], 0.8))
    r.glow = (0.0, 0.85, 0.45)
    r.glow_r = 0.85
    r.glow_c = mix(PAL['amber'], (255, 240, 210), 0.3)

def r_loft(r):
    # modern loft: sofa, big plant, concrete, warm floor lamp
    r.contact(-0.2, 0.36, 0.78, 0.56)
    r.box3(-0.2, 0.36, -0.20, 0.04, 0.78, 0.56, shade(PAL['bldg2'], 0.95))
    r.poly([(-0.18, 0.16, 0.58), (0.1, 0.16, 0.58), (0.1, 0.0, 0.58), (-0.18, 0.0, 0.58)], fill=shade(PAL['gold'], 0.95))
    # big plant
    r.poly([(0.4, 0.0, 0.9), (0.5, 0.0, 0.9), (0.48, -0.3, 0.9), (0.42, -0.3, 0.9)], fill=shade(PAL['stone'], 0.65))
    for a in range(6):
        ang = -0.5 + a * 0.2
        r.poly([(0.45, 0.55, 0.88), (0.45 + ang * 0.2, 0.2, 0.88), (0.45 + ang * 0.3, -0.15, 0.88)], fill=(0x4F, 0x6E, 0x40))
    # floor lamp
    r.poly([(-0.5, 0.4, 0.45), (-0.47, 0.4, 0.45), (-0.475, -0.42, 0.45), (-0.495, -0.42, 0.45)], fill=PAL['ink'])
    r.poly([(-0.52, 0.48, 0.45), (-0.45, 0.48, 0.45), (-0.45, 0.40, 0.45), (-0.52, 0.40, 0.45)], fill=PAL['amber'])
    r.glow = (-0.485, 0.85, 0.45)
    r.glow_r = 0.9
    # brick column hint on the left wall
    for i in range(6):
        y = 0.4 - i * 0.14
        r.poly([(-0.5, y, 0.55), (-0.5, y - 0.1, 0.55)], fill=shade(PAL['brick'], 0.7), ow=1)

def r_grandma(r):
    # china cabinet, doily armchair, warm orange dim
    r.box3(-0.40, -0.04, -0.10, 0.42, 1.0, 0.96, shade(PAL['bldg'], 0.9))      # cabinet
    r.poly([(-0.37, 0.30, 0.965), (-0.07, 0.30, 0.965), (-0.07, 0.02, 0.965), (-0.37, 0.02, 0.965)], fill=(0x2E, 0x2A, 0x3C))
    for i in range(4):
        x = -0.35 + i * 0.075
        r.poly([(x, 0.0, 0.97), (x + 0.05, 0.0, 0.97), (x + 0.045, -0.06, 0.97), (x + 0.005, -0.06, 0.97)], fill=shade(PAL['cream'], 0.9))
    r.poly([(-0.02, 0.30, 0.965), (0.0, 0.30, 0.965), (0.0, 0.02, 0.965), (-0.02, 0.02, 0.965)], fill=shade(PAL['bldg'], 0.6))
    # doily armchair
    r.contact(0.16, 0.46, 0.74, 0.56)
    r.box3(0.16, 0.46, -0.14, 0.10, 0.74, 0.56, shade(PAL['coral'], 0.72))
    r.poly([(0.18, 0.06, 0.58), (0.44, 0.06, 0.58), (0.44, -0.10, 0.58), (0.18, -0.10, 0.58)], fill=shade(PAL['coral'], 0.95))
    # TV dim
    r.box3(-0.02, 0.2, 0.12, 0.34, 0.9, 0.86, PAL['ink'])
    r.poly([(-0.005, 0.30, 0.87), (0.185, 0.30, 0.87), (0.185, 0.16, 0.87), (-0.005, 0.16, 0.87)], fill=(0x6A, 0x74, 0x86))
    r.glow = (0.0, 0.7, 0.6)
    r.glow_r = 0.9
    r.glow_c = mix(PAL['amber'], (255, 200, 120), 0.4)

# ---- commercial ----

def r_office(r):
    # desk rows + ceiling panels, cool fluorescent
    for row in range(2):
        t = 0.86 - row * 0.3
        y = -0.08 - row * 0.02
        for k in range(2):
            x0 = -0.44 + k * 0.46
            r.box3(x0, x0 + 0.34, y - 0.06, y + 0.06, t, t - 0.08, shade(PAL['bldg2'], 1.0))
            r.poly([(x0 + 0.06, y + 0.05, t - 0.04), (x0 + 0.16, y + 0.05, t - 0.04), (x0 + 0.16, y - 0.07, t - 0.04), (x0 + 0.06, y - 0.07, t - 0.04)], fill=PAL['ink'])
            r.poly([(x0 + 0.065, y + 0.045, t - 0.045), (x0 + 0.155, y + 0.045, t - 0.045), (x0 + 0.155, y - 0.06, t - 0.045), (x0 + 0.065, y - 0.06, t - 0.045)], fill=(0x9F, 0xC4, 0xD8))
            r.poly([(x0 + 0.2, y + 0.05, t - 0.04), (x0 + 0.28, y + 0.05, t - 0.04), (x0 + 0.28, y - 0.07, t - 0.04), (x0 + 0.2, y - 0.07, t - 0.04)], fill=PAL['ink'])
            r.poly([(x0 + 0.205, y + 0.045, t - 0.045), (x0 + 0.275, y + 0.045, t - 0.045), (x0 + 0.275, y - 0.06, t - 0.045), (x0 + 0.205, y - 0.06, t - 0.045)], fill=(0xB4, 0xCF, 0xDE))
    # ceiling light panels
    for lx in (-0.25, 0.25):
        r.poly([(lx - 0.12, 0.5, 0.25), (lx + 0.12, 0.5, 0.25), (lx + 0.12, 0.5, 0.25), (lx - 0.12, 0.5, 0.25)], fill=(240, 246, 252))
    r.glow = (0.0, 0.95, 0.3)
    r.glow_r = 1.05
    r.glow_c = (0xE8, 0xEE, 0xF6)

def r_diner(r):
    # booths + counter + checkerboard, warm pendants
    for k in range(2):
        t = 0.9 - k * 0.26
        x0 = -0.46 + k * 0.1
        r.box3(x0, x0 + 0.2, -0.10, 0.12, t, t - 0.06, shade(PAL['coral'], 0.8))     # booth back
        r.box3(x0 + 0.24, x0 + 0.42, -0.10, 0.06, t, t - 0.06, shade(PAL['coral'], 0.9))  # seat
        r.poly([(x0 + 0.2, -0.02, t - 0.05), (x0 + 0.46, -0.02, t - 0.05), (x0 + 0.46, -0.10, t - 0.05), (x0 + 0.2, -0.10, t - 0.05)], fill=shade(PAL['stone'], 0.9))  # table
    # counter right with stools
    r.box3(0.3, 0.5, -0.20, 0.10, 0.7, 0.6, shade(PAL['teal'], 0.7))
    for i in range(2):
        x = 0.34 + i * 0.1
        r.poly([(x - 0.025, -0.16, 0.5), (x + 0.025, -0.16, 0.5), (x + 0.025, -0.36, 0.5), (x - 0.025, -0.36, 0.5)], fill=PAL['ink'])
        r.poly([(x - 0.04, -0.12, 0.5), (x + 0.04, -0.12, 0.5), (x + 0.04, -0.16, 0.5), (x - 0.04, -0.16, 0.5)], fill=PAL['coral'])
    # menu board
    r.poly([(-0.44, 0.44, 1), (-0.1, 0.44, 1), (-0.1, 0.14, 1), (-0.44, 0.14, 1)], fill=shade(PAL['ink'], 1.2), outline=shade(PAL['gold'], 0.8), ow=2)
    for i in range(3):
        r.poly([(-0.40, 0.36 - i * 0.08, 1), (-0.16, 0.36 - i * 0.08, 1), (-0.16, 0.33 - i * 0.08, 1), (-0.40, 0.33 - i * 0.08, 1)], fill=shade(PAL['cream'], 0.8))
    r.glow = (0.0, 0.9, 0.4)
    r.glow_r = 0.95
    r.glow_c = mix(PAL['amber'], (255, 235, 190), 0.25)

def r_bakery(r):
    # display case + bread wall, warm
    r.box3(-0.5, 0.1, -0.30, 0.02, 0.9, 0.8, shade(PAL['stone'], 0.9))
    r.poly([(-0.48, 0.0, 0.82), (0.08, 0.0, 0.82), (0.08, -0.26, 0.82), (-0.48, -0.26, 0.82)], fill=(0xC8, 0xD4, 0xD2))  # glass front
    for i in range(4):
        x = -0.44 + i * 0.13
        r.poly([(x, -0.06, 0.83), (x + 0.09, -0.06, 0.83), (x + 0.09, -0.14, 0.83), (x, -0.14, 0.83)], fill=shade(PAL['gold'], 1.02))
    # bread shelves back wall
    r.box3(0.2, 0.5, -0.05, 0.42, 1.0, 0.95, shade(PAL['bldg'], 0.8))
    for s in range(2):
        y0 = 0.16 - s * 0.2
        for i in range(4):
            x = 0.23 + i * 0.065
            r.poly([(x, y0, 0.965), (x + 0.05, y0, 0.965), (x + 0.05, y0 - 0.09, 0.965), (x, y0 - 0.09, 0.965)], fill=shade(PAL['bldg2'], 1.2))
    r.glow = (0.0, 0.6, 0.6)
    r.glow_r = 0.95
    r.glow_c = mix(PAL['amber'], (255, 226, 170), 0.2)

def r_records(r):
    # crate bins + posters, dim warm
    for k in range(3):
        x0 = -0.46 + k * 0.3
        r.box3(x0, x0 + 0.24, -0.20, 0.0, 0.88, 0.82, shade(PAL['bldg'], 0.85))
        for i in range(5):
            x = x0 + 0.015 + i * 0.042
            c = [PAL['ink'], PAL['brick'], PAL['plum'], PAL['teal'], PAL['bldg2']][int(r.rng() * 5)]
            r.poly([(x, 0.0, 0.845), (x + 0.032, 0.0, 0.845), (x + 0.032, -0.17, 0.845), (x, -0.17, 0.845)], fill=shade(c, 0.95))
    # posters
    r.poly([(0.24, 0.46, 1), (0.42, 0.46, 1), (0.42, 0.18, 1), (0.24, 0.18, 1)], fill=PAL['coral'])
    r.poly([(0.02, 0.44, 1), (0.18, 0.44, 1), (0.18, 0.22, 1), (0.02, 0.22, 1)], fill=PAL['teal'])
    r.glow = (0.0, 0.55, 0.6)
    r.glow_r = 0.8
    r.glow_c = mix(PAL['amber'], (255, 210, 150), 0.35)

def r_barber(r):
    # chair + mirror station, cool+warm
    r.box3(-0.16, 0.16, 0.0, 0.44, 1.0, 0.96, shade(PAL['bldg'], 0.85))       # mirror station
    r.poly([(-0.12, 0.38, 0.965), (0.12, 0.38, 0.965), (0.12, 0.10, 0.965), (-0.12, 0.10, 0.965)], fill=(0xB9, 0xC8, 0xD2))
    r.poly([(-0.14, 0.42, 0.96), (0.14, 0.42, 0.96), (0.14, 0.38, 0.96), (-0.14, 0.38, 0.96)], fill=PAL['gold'])
    # chair
    r.contact(-0.1, 0.14, 0.8, 0.6)
    r.box3(-0.1, 0.14, -0.12, 0.06, 0.8, 0.6, shade(PAL['ink'], 1.35))
    r.poly([(-0.08, 0.02, 0.62), (0.12, 0.02, 0.62), (0.12, -0.10, 0.62), (-0.08, -0.10, 0.62)], fill=shade(PAL['brick'], 0.9))
    # sink left
    r.box3(-0.48, -0.30, -0.30, -0.10, 0.94, 0.9, shade(PAL['cream'], 0.92))
    r.glow = (0.0, 0.8, 0.5)
    r.glow_r = 0.95
    r.glow_c = (0xE0, 0xEA, 0xF0)

def r_bodega(r):
    # snack shelves + fridge glow, fluorescent
    for s in range(3):
        y0 = 0.34 - s * 0.22
        r.poly([(-0.5, y0, 1), (0.1, y0, 1), (0.1, y0 - 0.04, 1), (-0.5, y0 - 0.04, 1)], fill=shade(PAL['bldg'], 0.7))
        bx = -0.47
        while bx < 0.06:
            bw = 0.04 + r.rng() * 0.05
            bh = 0.08 + r.rng() * 0.06
            c = [PAL['coral'], PAL['gold'], PAL['teal'], PAL['cream'], PAL['plum']][int(r.rng() * 5)]
            r.poly([(bx, y0 - 0.04, 1), (bx + bw, y0 - 0.04, 1), (bx + bw, y0 - 0.04 - bh, 1), (bx, y0 - 0.04 - bh, 1)], fill=shade(c, 1.0))
            bx += bw + 0.012
    # drink fridge right — the glowing box
    r.box3(0.18, 0.5, -0.34, 0.34, 1.0, 0.96, shade(PAL['cream'], 0.85))
    r.poly([(0.21, 0.28, 0.955), (0.47, 0.28, 0.955), (0.47, -0.28, 0.955), (0.21, -0.28, 0.955)], fill=mix((0xD8, 0xE6, 0xEE), (255, 255, 255), 0.2))
    for i in range(3):
        r.poly([(0.24, 0.2 - i * 0.16, 0.96), (0.44, 0.2 - i * 0.16, 0.96), (0.44, 0.12 - i * 0.16, 0.96), (0.24, 0.12 - i * 0.16, 0.96)],
               fill=[PAL['coral'], PAL['gold'], PAL['teal']][i])
    r.glow = (0.34, 0.5, 0.85)
    r.glow_r = 0.85
    r.glow_c = (0xE8, 0xF0, 0xF6)

def r_rest_kitchen(r):
    # steel counters + hood, cool
    r.box3(-0.5, 0.2, -0.26, 0.0, 0.95, 0.88, shade((0x9A, 0xA2, 0xAA), 1.0))
    r.poly([(-0.5, 0.01, 0.9), (0.2, 0.01, 0.9), (0.2, -0.08, 0.9), (-0.5, -0.08, 0.9)], fill=shade((0xC4, 0xCC, 0xD2), 1.0))
    # hanging pots
    for i in range(4):
        x = -0.3 + i * 0.14
        r.poly([(x, 0.5, 0.7), (x + 0.008, 0.5, 0.7), (x + 0.008, 0.30, 0.7), (x, 0.30, 0.7)], fill=shade(PAL['ink'], 1.3))
        r.poly([(x - 0.03, 0.30, 0.7), (x + 0.038, 0.30, 0.7), (x + 0.038, 0.20, 0.7), (x - 0.03, 0.20, 0.7)], fill=shade((0xB0, 0xB8, 0xC0), 1.0))
    # ticket rail
    r.poly([(0.24, 0.44, 1), (0.46, 0.44, 1), (0.46, 0.40, 1), (0.24, 0.40, 1)], fill=shade(PAL['ink'], 1.2))
    r.glow = (0.0, 0.85, 0.45)
    r.glow_r = 0.95
    r.glow_c = (0xE2, 0xE8, 0xEE)

def r_shop(r):
    # clothing racks + till, warm track light
    for k in range(2):
        t = 0.85 - k * 0.22
        x0 = -0.4 + k * 0.2
        r.poly([(x0, -0.42, t), (x0 + 0.3, -0.42, t), (x0 + 0.3, -0.5, t), (x0, -0.5, t)], fill=shade(PAL['ink'], 1.2))  # rack base
        for i in range(6):
            hx = x0 + 0.03 + i * 0.05
            c = [PAL['coral'], PAL['teal'], PAL['cream'], PAL['plum'], PAL['gold'], PAL['brick']][i]
            r.poly([(hx, 0.06, t), (hx + 0.04, 0.06, t), (hx + 0.04, -0.24, t), (hx, -0.24, t)], fill=shade(c, 0.95))
    # till counter
    r.box3(0.26, 0.5, -0.28, -0.06, 0.9, 0.84, shade(PAL['bldg2'], 0.95))
    r.glow = (0.0, 0.9, 0.35)
    r.glow_r = 0.9
    r.glow_c = mix(PAL['amber'], (255, 240, 205), 0.3)

def r_bar(r):
    # backlit bottle shelf + stools, amber
    r.box3(-0.5, 0.1, 0.0, 0.46, 1.0, 0.95, shade(PAL['bldg'], 0.7))
    for i in range(9):
        x = -0.46 + i * 0.062
        h = 0.14 + (i % 3) * 0.03
        c = [PAL['gold'], PAL['teal'], PAL['coral'], PAL['cream']][i % 4]
        r.poly([(x, 0.14, 0.955), (x + 0.045, 0.14, 0.955), (x + 0.045, 0.14 - h, 0.955), (x, 0.14 - h, 0.955)], fill=shade(c, 0.9))
    # bar top
    r.poly([(-0.5, -0.10, 0.45), (0.5, -0.10, 0.45), (0.5, -0.20, 0.4), (-0.5, -0.20, 0.4)], fill=shade(PAL['bldg'], 1.1))
    for i in range(3):
        x = -0.3 + i * 0.3
        r.poly([(x - 0.03, -0.36, 0.4), (x + 0.03, -0.36, 0.4), (x + 0.03, -0.16, 0.4), (x - 0.03, -0.16, 0.4)], fill=PAL['ink'])
    r.glow = (-0.2, 0.4, 0.9)
    r.glow_r = 0.9
    r.glow_c = mix(PAL['amber'], (255, 190, 110), 0.45)

def r_cafe(r):
    # counter + menu board + pendants, warm
    r.box3(-0.5, 0.06, -0.28, 0.0, 0.95, 0.86, shade(PAL['bldg2'], 1.0))
    r.poly([(-0.5, 0.0, 0.88), (0.06, 0.0, 0.88), (0.06, -0.1, 0.88), (-0.5, -0.1, 0.88)], fill=shade(PAL['stone'], 0.9))
    # espresso machine
    r.box3(-0.2, -0.04, -0.02, 0.14, 0.9, 0.86, shade(PAL['ink'], 1.5))
    # menu board
    r.poly([(0.16, 0.46, 1), (0.46, 0.46, 1), (0.46, 0.1, 1), (0.16, 0.1, 1)], fill=shade(PAL['ink'], 1.25), outline=shade(PAL['teal'], 0.9), ow=2)
    for i in range(4):
        r.poly([(0.2, 0.38 - i * 0.075, 1), (0.42, 0.38 - i * 0.075, 1), (0.42, 0.35 - i * 0.075, 1), (0.2, 0.35 - i * 0.075, 1)], fill=shade(PAL['cream'], 0.85))
    # pendant lamps
    for x in (-0.3, 0.0):
        r.poly([(x - 0.004, 0.5, 0.4), (x + 0.004, 0.5, 0.4), (x + 0.004, 0.34, 0.4), (x - 0.004, 0.34, 0.4)], fill=PAL['ink'])
        r.poly([(x - 0.04, 0.34, 0.4), (x + 0.04, 0.34, 0.4), (x + 0.04, 0.26, 0.4), (x - 0.04, 0.26, 0.4)], fill=PAL['gold'])
    r.glow = (-0.15, 0.85, 0.4)
    r.glow_r = 0.95
    r.glow_c = mix(PAL['amber'], (255, 238, 200), 0.3)

def r_gym(r):
    # rack + bench + mirrors, cool
    r.poly([(-0.44, 0.46, 1), (0.46, 0.46, 1), (0.46, -0.5, 1), (-0.44, -0.5, 1)], fill=(0xB9, 0xC4, 0xC9))  # mirror wall
    r.poly([(-0.46, 0.48, 1), (0.48, 0.48, 1), (0.48, 0.44, 1), (-0.46, 0.44, 1)], fill=shade(PAL['ink'], 1.3))
    # weight rack
    r.box3(-0.4, 0.0, -0.3, -0.05, 0.9, 0.84, shade(PAL['ink'], 1.25))
    for i in range(5):
        x = -0.36 + i * 0.08
        r.poly([(x, -0.02, 0.86), (x + 0.06, -0.02, 0.86), (x + 0.06, -0.14, 0.86), (x, -0.14, 0.86)], fill=shade(PAL['ink'], 1.6))
    # bench
    r.box3(0.12, 0.42, -0.34, -0.24, 0.6, 0.5, shade(PAL['bldg2'], 0.9))
    r.glow = (0.0, 0.9, 0.4)
    r.glow_r = 1.0
    r.glow_c = (0xDE, 0xE6, 0xEE)

def r_stairwell(r):
    # service stair: treads rising to the right, handrail, dim
    n = 7
    for i in range(n):
        t = 0.95 - i * 0.1
        y = -0.5 + i * 0.135
        x0 = -0.5 + i * 0.14
        r.poly([(x0, y, t), (x0 + 0.5, y, t), (x0 + 0.5, y - 0.03, t), (x0, y - 0.03, t)], fill=shade(PAL['stone'], 0.72))
        r.poly([(x0, y, t), (x0 + 0.06, y + 0.02, t + 0.04)], fill=shade(PAL['stone'], 0.6), ow=1)
    # handrail
    r.poly([(-0.52, 0.42, 0.9), (-0.5, 0.44, 0.9), (0.34, -0.16, 0.35), (0.32, -0.18, 0.35)], fill=shade(PAL['ink'], 1.4))
    r.glow = (0.0, 0.9, 0.5)
    r.glow_r = 0.9
    r.glow_c = (0xC9, 0xD2, 0xDC)

def r_storage(r):
    # shelving rows + bare bulb, dim
    for k in range(2):
        t = 0.9 - k * 0.3
        x0 = -0.48 + k * 0.5
        r.box3(x0, x0 + 0.4, -0.15, 0.45, t, t - 0.03, shade(PAL['bldg'], 0.7))
        for s in range(3):
            y0 = 0.24 - s * 0.22
            r.poly([(x0 + 0.01, y0, t - 0.01), (x0 + 0.39, y0, t - 0.01), (x0 + 0.39, y0 - 0.03, t - 0.01), (x0 + 0.01, y0 - 0.03, t - 0.01)], fill=shade(PAL['bldg'], 0.55))
            for i in range(5):
                bx = x0 + 0.03 + i * 0.07
                c = shade(PAL['bldg2'], 0.85 + r.rng() * 0.3)
                r.poly([(bx, y0 - 0.03, t - 0.012), (bx + 0.055, y0 - 0.03, t - 0.012), (bx + 0.055, y0 - 0.16, t - 0.012), (bx, y0 - 0.16, t - 0.012)], fill=c)
    r.glow = (0.0, 0.85, 0.4)
    r.glow_r = 0.85
    r.glow_c = (0xE6, 0xD9, 0xBE)

def r_workshop(r):
    # workbench + pegboard + task lamp, warm
    r.box3(-0.5, 0.1, -0.30, -0.02, 0.92, 0.84, shade(PAL['bldg'], 0.8))
    r.poly([(-0.5, -0.02, 0.86), (0.1, -0.02, 0.86), (0.1, -0.10, 0.86), (-0.5, -0.10, 0.86)], fill=shade(PAL['bldg2'], 0.9))
    # pegboard
    r.poly([(0.2, 0.44, 1), (0.5, 0.44, 1), (0.5, -0.02, 1), (0.2, -0.02, 1)], fill=shade(PAL['bldg2'], 1.1))
    for _ in range(8):
        x = 0.23 + r.rng() * 0.24
        y = -0.0 + r.rng() * 0.36
        r.poly([(x, y + 0.05, 1), (x + 0.03, y + 0.05, 1), (x + 0.03, y, 1), (x, y, 1)], fill=shade(PAL['ink'], 1.35))
    # task lamp
    r.poly([(-0.46, 0.42, 0.7), (-0.4, 0.30, 0.7)], fill=shade(PAL['ink'], 1.3), ow=2)
    r.poly([(-0.44, 0.34, 0.7), (-0.36, 0.34, 0.7), (-0.36, 0.26, 0.7), (-0.44, 0.26, 0.7)], fill=PAL['gold'])
    r.glow = (-0.4, 0.4, 0.7)
    r.glow_r = 0.8
    r.glow_c = mix(PAL['amber'], (255, 220, 160), 0.3)

def r_laundromat(r):
    # washer row with round doors, fluorescent
    for i in range(4):
        x0 = -0.5 + i * 0.16
        t = 0.92 - (i % 2) * 0.05
        r.box3(x0, x0 + 0.14, -0.36, 0.16, t, t - 0.04, shade(PAL['cream'], 0.9))
        p = px(proj(x0 + 0.07, -0.08, t - 0.03), r.S)
        rr = 0.05 * r.S * k_of(t)
        r.d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=(0x44, 0x4C, 0x58), outline=shade(PAL['stone'], 0.6), width=2)
    # folding table
    r.box3(-0.1, 0.4, -0.4, -0.32, 0.7, 0.6, shade(PAL['stone'], 0.85))
    r.glow = (0.0, 0.92, 0.35)
    r.glow_r = 1.05
    r.glow_c = (0xE8, 0xEE, 0xF4)

def r_dark_office(r):
    # after hours: one desk lamp, everything else fading
    r.box3(-0.1, 0.4, -0.3, -0.06, 0.85, 0.72, shade(PAL['bldg'], 0.55))
    r.poly([(0.02, 0.12, 0.74), (0.16, 0.12, 0.74), (0.16, -0.10, 0.74), (0.02, -0.10, 0.74)], fill=shade(PAL['ink'], 0.9))
    r.poly([(0.03, 0.11, 0.735), (0.15, 0.11, 0.735), (0.15, -0.09, 0.735), (0.03, -0.09, 0.735)], fill=(0x74, 0x8C, 0x9E))
    # the desk lamp pool
    r.poly([(-0.34, 0.34, 0.76), (-0.28, 0.34, 0.76), (-0.29, 0.16, 0.76), (-0.33, 0.16, 0.76)], fill=PAL['ink'])
    r.poly([(-0.36, 0.38, 0.76), (-0.26, 0.38, 0.76), (-0.26, 0.30, 0.76), (-0.36, 0.30, 0.76)], fill=PAL['amber'])
    # chairs parked
    r.poly([(-0.5, 0.0, 0.5), (-0.36, 0.0, 0.5), (-0.36, -0.3, 0.5), (-0.5, -0.3, 0.5)], fill=shade(PAL['ink'], 1.1))
    r.glow = (-0.31, 0.5, 0.76)
    r.glow_r = 0.75
    r.glow_c = mix(PAL['amber'], (255, 214, 150), 0.35)

# ---------------------------------------------------------------- assembly ---
ROOM_WALLS = {
    0: shade(PAL['bldg2'], 1.35), 1: shade(PAL['amber'], 0.86), 2: shade(PAL['stone'], 0.9),
    3: shade(PAL['teal'], 0.42), 4: shade(PAL['plum'], 0.78), 5: shade(PAL['coral'], 0.42),
    6: shade(PAL['stone'], 1.02), 7: shade(PAL['stone'], 0.84), 8: shade(PAL['cream'], 0.9),
    9: shade(PAL['bldg'], 1.15), 10: shade(PAL['stone'], 1.05), 11: shade(PAL['bldg2'], 1.15),
    12: shade(PAL['stone'], 0.95), 13: shade(PAL['amber'], 0.7), 14: shade((0xB8, 0xB2, 0xA8), 1.0),
    15: shade(PAL['amber'], 0.62),
    16: shade(PAL['stone'], 1.1), 17: shade(PAL['cream'], 0.88), 18: shade(PAL['amber'], 0.8),
    19: shade(PAL['bldg'], 1.0), 20: shade(PAL['stone'], 0.96), 21: shade(PAL['cream'], 0.95),
    22: shade((0xB0, 0xB6, 0xBC), 1.0), 23: shade(PAL['stone'], 1.0), 24: shade(PAL['plum'], 0.6),
    25: shade(PAL['cream'], 0.92), 26: shade((0xAE, 0xB4, 0xBA), 1.0), 27: shade(PAL['stone'], 0.7),
    28: shade(PAL['bldg2'], 0.9), 29: shade(PAL['bldg2'], 1.05), 30: shade(PAL['stone'], 1.08),
    31: shade(PAL['bldg'], 0.72),
}

ROOM_BUILDERS = [
    r_living, r_parlor, r_studio, r_kitchen, r_bedroom, r_kid, r_dining, r_empty,
    r_artist, r_books, r_bath, r_office_home, r_laundry_corner, r_hall, r_loft, r_grandma,
    r_office, r_diner, r_bakery, r_records, r_barber, r_bodega, r_rest_kitchen, r_shop,
    r_bar, r_cafe, r_gym, r_stairwell, r_storage, r_workshop, r_laundromat, r_dark_office,
]

FLOOR_KINDS = ['wood'] * 12 + ['tile', 'wood', 'wood', 'wood'] + \
              ['concrete', 'checker', 'tile', 'dark', 'tile', 'checker', 'concrete', 'wood',
               'dark', 'checker', 'concrete', 'dark', 'concrete', 'wood', 'tile', 'dark']

def build_rooms(out_path, sheet_path):
    W, H = ROOMS_COLS * CELL, ROOMS_ROWS * CELL
    sheet = Image.new('RGB', (W, H))
    for idx, builder in enumerate(ROOM_BUILDERS):
        cx, cy = idx % ROOMS_COLS, idx // ROOMS_COLS
        rng = mulberry32(0xFE57 + idx * 7919)
        warm = 1.0 if idx < 16 else 0.96
        glow_c = None
        if idx == 7: glow_c = mix(PAL['amber'], (230, 238, 250), 0.55)
        if idx == 31: glow_c = mix(PAL['amber'], (255, 200, 130), 0.5)
        r = Room(CELL, rng, ROOM_WALLS[idx], floor_kind=FLOOR_KINDS[idx], warm=warm, glow_c=glow_c)
        r.draw_shell()
        builder(r)
        img = with_gutter(r.finish(), 8)
        sheet.paste(img, (cx * CELL, cy * CELL))
    sheet.save(out_path, 'PNG', optimize=True)
    sheet.save(sheet_path, 'PNG', optimize=True)
    print(f'rooms: {out_path} ({W}x{H})')

# ---------------------------------------------------------------- fronts -----
def build_fronts(out_path, sheet_path):
    S = CELL
    W, H = FRONT_COLS * S, FRONT_ROWS * S
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    CREAM = PAL['cream']
    TEAL = PAL['teal']
    CORAL = PAL['coral']
    PLUM = PAL['plum']

    def cell_img(idx):
        img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img)

    def place(idx, img):
        cx, cy = idx % FRONT_COLS, idx // FRONT_COLS
        sheet.paste(with_gutter(img, 8), (cx * S, cy * S))

    def curtain_panel(d, x0, x1, col, alpha, folds=6):
        for i in range(folds):
            f0 = x0 + (x1 - x0) * i / folds
            f1 = x0 + (x1 - x0) * (i + 1) / folds
            k = 0.86 + 0.28 * ((i * 2654435761) % 100) / 100.0
            d.rectangle([f0, 0, f1, S], fill=(*shade(col, k), alpha))

    # 0 — clear glass
    img, _ = cell_img(0); place(0, img)
    # 1 — sheer side panels
    img, d = cell_img(1)
    curtain_panel(d, 0, S * 0.18, CREAM, 150)
    curtain_panel(d, S * 0.82, S, CREAM, 150)
    place(1, img)
    # 2 — one curtain drawn across half
    img, d = cell_img(2)
    curtain_panel(d, S * 0.42, S, CREAM, 216, folds=7)
    place(2, img)
    # 3 — venetian blinds closed-ish
    img, d = cell_img(3)
    for y in range(0, S, 16):
        d.rectangle([0, y, S, y + 10], fill=(*shade(CREAM, 0.94), 190))
    place(3, img)
    # 4 — blinds half raised
    img, d = cell_img(4)
    for y in range(0, int(S * 0.45), 16):
        d.rectangle([0, y, S, y + 10], fill=(*shade(CREAM, 0.94), 190))
    d.rectangle([0, 0, S, 12], fill=(*shade(CREAM, 0.8), 235))
    place(4, img)
    # 5 — café curtain bottom
    img, d = cell_img(5)
    curtain_panel(d, 0, S, CREAM, 196, folds=5)
    d.rectangle([0, 0, S, S * 0.42], fill=(0, 0, 0, 0))
    d.rectangle([0, S * 0.40, S, S * 0.44], fill=(*shade(TEAL, 0.9), 235))
    place(5, img)
    # 6 — soft voile panel (low-frequency vertical bands — anything finer
    # aliases into facade speckle at street distance)
    img, d = cell_img(6)
    d.rectangle([0, 0, S, S], fill=(*shade(CREAM, 1.0), 52))
    for x in range(0, S, 48):
        for xx in range(14):
            a = 46 - int(xx * 3.2)
            d.line([x + xx, 0, x + xx, S], fill=(*shade(CREAM, 1.05), max(20, a)))
            d.line([x + 47 - xx, 0, x + 47 - xx, S], fill=(*shade(CREAM, 1.05), max(20, a)))
    place(6, img)
    # 7 — AC unit (the NYC summer tell)
    img, d = cell_img(7)
    ux0, ux1, uy0, uy1 = int(S * 0.16), int(S * 0.84), int(S * 0.52), int(S * 0.92)
    d.rectangle([ux0, uy0, ux1, uy1], fill=(*shade(PAL['stone'], 0.88), 255))
    d.rectangle([ux0 + 4, uy0 + 4, ux1 - 4, uy0 + 14], fill=(*shade(PAL['stone'], 1.0), 255))
    for y in range(uy0 + 20, uy1 - 6, 8):
        d.line([ux0 + 8, y, ux1 - 8, y], fill=(*shade(PAL['stone'], 0.55), 255), width=3)
    d.rectangle([ux0, uy0, ux1, uy1], outline=(*shade(PAL['stone'], 0.6), 255), width=2)
    place(7, img)
    # 8 — night glass tint
    img, d = cell_img(8)
    d.rectangle([0, 0, S, S], fill=(0x1A, 0x22, 0x33, 60))
    place(8, img)
    # 9 — plant on the sill
    img, d = cell_img(9)
    d.rectangle([0, S - 22, S, S], fill=(*shade(PAL['stone'], 0.85), 255))
    for a in range(5):
        ang = -0.8 + a * 0.4
        x0 = S * 0.5
        d.line([x0, S - 22, x0 + ang * S * 0.28, S - 22 - S * (0.3 + 0.06 * (a % 3))],
               fill=(*shade((0x4F, 0x6E, 0x40), 1.0), 235), width=5)
    d.ellipse([S * 0.42, S - 34, S * 0.58, S - 18], fill=(*shade(PAL['coral'], 0.8), 255))
    place(9, img)
    # 10 — blackout curtains
    img, d = cell_img(10)
    curtain_panel(d, 0, S, PLUM, 242, folds=8)
    place(10, img)
    # 11 — tie-back curtains open
    img, d = cell_img(11)
    curtain_panel(d, 0, S * 0.26, CORAL, 210, folds=4)
    curtain_panel(d, S * 0.74, S, CORAL, 210, folds=4)
    d.polygon([(S * 0.26, S * 0.3), (S * 0.19, S * 0.34), (S * 0.26, S * 0.62)], fill=(*shade(CORAL, 0.9), 255))
    d.polygon([(S * 0.74, S * 0.3), (S * 0.81, S * 0.34), (S * 0.74, S * 0.62)], fill=(*shade(CORAL, 0.9), 255))
    place(11, img)
    # 12 — valance top only
    img, d = cell_img(12)
    curtain_panel(d, 0, S, TEAL, 225, folds=7)
    d.rectangle([0, S * 0.30, S, S], fill=(0, 0, 0, 0))
    d.rectangle([0, S * 0.28, S, S * 0.32], fill=(*shade(TEAL, 0.7), 255))
    place(12, img)
    # 13 — box fan
    img, d = cell_img(13)
    fx0, fy0, fx1, fy1 = int(S * 0.3), int(S * 0.34), int(S * 0.7), int(S * 0.72)
    d.rectangle([fx0, fy0, fx1, fy1], fill=(*shade(PAL['stone'], 0.9), 255))
    d.ellipse([fx0 + 8, fy0 + 8, fx1 - 8, fy1 - 8], fill=(*shade(PAL['ink'], 1.6), 255))
    for a in range(4):
        ang = a * math.pi / 2
        d.pieslice([fx0 + 12, fy0 + 12, fx1 - 12, fy1 - 12], ang * 57.3, ang * 57.3 + 52, fill=(*shade(PAL['stone'], 0.82), 255))
    d.rectangle([fx0, fy0, fx1, fy1], outline=(*shade(PAL['stone'], 0.62), 255), width=2)
    place(13, img)
    # 14 — corner grime (the city writes on glass)
    img, d = cell_img(14)
    for (cx, cy) in [(0, 0), (S, 0), (0, S), (S, S)]:
        for i in range(5):
            rr = 10 + i * 13
            a = 26 - i * 5
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(120, 116, 108, a))
    place(14, img)
    # 15 — frosted bottom (privacy film)
    img, d = cell_img(15)
    d.rectangle([0, int(S * 0.52), S, S], fill=(*shade(PAL['stone'], 1.0), 150))
    d.rectangle([0, int(S * 0.52) - 3, S, int(S * 0.52)], fill=(*shade(PAL['stone'], 0.8), 200))
    place(15, img)

    sheet.save(out_path, 'PNG', optimize=True)
    sheet.save(sheet_path, 'PNG', optimize=True)
    print(f'fronts: {out_path} ({W}x{H})')

# -------------------------------------------------------------------- main ---
def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pub = os.path.join(root, 'web-three', 'public', 'textures')
    os.makedirs(pub, exist_ok=True)
    rooms = os.path.join(pub, 'fenestra_rooms.png')
    fronts = os.path.join(pub, 'fenestra_fronts.png')
    build_rooms(rooms,
                os.path.join(root, 'assets', 'fenestra', 'fenestra_rooms_sheet.png'))
    build_fronts(fronts,
                 os.path.join(root, 'assets', 'fenestra', 'fenestra_fronts_sheet.png'))
    # NOTE: no mip chain — the loader ships LinearFilter (see
    # fenestraMaterial.configureAtlas for the verified tradeoff).

if __name__ == '__main__':
    main()
