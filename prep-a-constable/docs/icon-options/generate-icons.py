"""
App Store icon concepts for Prep a Constable.

Rendered at 4x and downsampled, so the curves are clean. Output is 1024x1024
RGB with NO alpha channel and NO rounded corners, which is what App Store
Connect requires — Apple applies the rounded mask itself.

The palette is taken from shared/theme.js, not re-picked by eye.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/user/amarah/prep-a-constable/docs/icon-options"
os.makedirs(OUT, exist_ok=True)

FONT_DIR = "/tmp/claude-0/fonts/node_modules/@expo-google-fonts/fraunces"
F_SEMI_IT = f"{FONT_DIR}/600SemiBold_Italic/Fraunces_600SemiBold_Italic.ttf"
F_BOLD_IT = f"{FONT_DIR}/700Bold_Italic/Fraunces_700Bold_Italic.ttf"
F_SEMI = f"{FONT_DIR}/600SemiBold/Fraunces_600SemiBold.ttf"
F_BOLD = f"{FONT_DIR}/700Bold/Fraunces_700Bold.ttf"

# shared/theme.js
NAVY = (0x1A, 0x3A, 0x6C)
NAVY_DARK = (0x14, 0x30, 0x5A)
NAVY_DEEP = (0x0E, 0x1B, 0x33)
NAVY_LIGHT = (0x4A, 0x6F, 0xA5)
GOLD = (0xB8, 0x92, 0x3C)
GOLD_BRIGHT = (0xC9, 0xA2, 0x27)
PAPER = (0xFA, 0xFA, 0xF7)
WHITE = (0xFF, 0xFF, 0xFF)

S = 1024
SS = 4              # supersample
W = S * SS


def bez(p0, p1, p2, p3, steps=60):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0]
        y = u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        pts.append((x, y))
    return pts


def shield_points(cx, cy, w, h):
    """The app's own shield, from the SVG path in Graphics.js (40x46 viewBox)."""
    sx, sy = w / 40.0, h / 46.0
    ox, oy = cx - w / 2, cy - h / 2
    P = lambda x, y: (ox + x * sx, oy + y * sy)
    pts = [P(20, 2), P(36, 7), P(36, 22)]
    pts += [P(x, y) for x, y in bez((36, 22), (36, 33), (28, 41), (20, 44))]
    pts += [P(x, y) for x, y in bez((20, 44), (12, 41), (4, 33), (4, 22))]
    pts += [P(4, 7)]
    return pts


def vgrad(img, top, bottom):
    d = ImageDraw.Draw(img)
    for y in range(img.height):
        t = y / max(1, img.height - 1)
        d.line([(0, y), (img.width, y)],
               fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))


def chequer(d, x, y, w, h, rows, cols, a, b):
    cw, ch = w / cols, h / rows
    for r in range(rows):
        for c in range(cols):
            d.rectangle([x + c*cw, y + r*ch, x + (c+1)*cw, y + (r+1)*ch],
                        fill=a if (r + c) % 2 == 0 else b)


def centred(d, text, font, cx, cy, fill):
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    d.text((cx - (r + l) / 2, cy - (b + t) / 2), text, font=font, fill=fill)


def finish(img, name):
    img = img.resize((S, S), Image.LANCZOS).convert("RGB")
    img.save(f"{OUT}/{name}.png")
    return img


# ─── A — the shield, as the app draws it ────────────────────────────────────
def option_a():
    img = Image.new("RGB", (W, W))
    vgrad(img, NAVY, NAVY_DARK)
    d = ImageDraw.Draw(img)
    d.polygon(shield_points(W/2, W*0.47, W*0.62, W*0.71), fill=NAVY_DEEP,
              outline=GOLD, width=int(W*0.011))
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.30))
    centred(d, "PC", f, W/2, W*0.43, GOLD_BRIGHT)
    return finish(img, "A-shield")


# ─── B — chequered band, the Met's own signal ───────────────────────────────
def option_b():
    img = Image.new("RGB", (W, W))
    vgrad(img, NAVY, NAVY_DARK)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.40))
    centred(d, "PC", f, W/2, W*0.40, WHITE)
    chequer(d, 0, W*0.72, W, W*0.13, 2, 16, WHITE, NAVY_DEEP)
    return finish(img, "B-chequer-band")


# ─── C — typographic, the one that survives at 60px ─────────────────────────
def option_c():
    img = Image.new("RGB", (W, W))
    vgrad(img, NAVY, NAVY_DEEP)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.52))
    centred(d, "PC", f, W/2, W*0.45, GOLD_BRIGHT)
    d.rectangle([W*0.34, W*0.70, W*0.66, W*0.715], fill=GOLD)
    return finish(img, "C-typographic")


# ─── D — shield carrying the chequer band ───────────────────────────────────
def option_d():
    img = Image.new("RGB", (W, W))
    vgrad(img, NAVY_LIGHT, NAVY)
    d = ImageDraw.Draw(img)
    pts = shield_points(W/2, W*0.48, W*0.66, W*0.76)

    shield = Image.new("RGB", (W, W))
    sd = ImageDraw.Draw(shield)
    vgrad(shield, NAVY, NAVY_DEEP)
    chequer(sd, 0, W*0.585, W, W*0.085, 1, 8, WHITE, NAVY_DEEP)
    mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    img.paste(shield, (0, 0), mask)

    d.line(pts + [pts[0]], fill=WHITE, width=int(W*0.012), joint="curve")
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.27))
    centred(d, "PC", f, W/2, W*0.40, GOLD_BRIGHT)
    return finish(img, "D-shield-chequer")


# ─── E — paper, so it stands out in a row of dark icons ─────────────────────
def option_e():
    img = Image.new("RGB", (W, W), PAPER)
    d = ImageDraw.Draw(img)
    chequer(d, 0, 0, W, W*0.13, 1, 8, NAVY_DEEP, PAPER)
    d.polygon(shield_points(W/2, W*0.58, W*0.70, W*0.78), fill=NAVY)
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.33))
    centred(d, "PC", f, W/2, W*0.53, GOLD_BRIGHT)
    return finish(img, "E-paper")


# ─── F — gold shield, navy ground ───────────────────────────────────────────
def option_f():
    img = Image.new("RGB", (W, W))
    vgrad(img, NAVY, NAVY_DEEP)
    d = ImageDraw.Draw(img)
    d.polygon(shield_points(W/2, W*0.47, W*0.64, W*0.73), fill=GOLD)
    f = ImageFont.truetype(F_SEMI_IT, int(W * 0.30))
    centred(d, "PC", f, W/2, W*0.43, NAVY_DEEP)
    return finish(img, "F-gold-shield")


names = ["A-shield", "B-chequer-band", "C-typographic",
         "D-shield-chequer", "E-paper", "F-gold-shield"]
imgs = [option_a(), option_b(), option_c(), option_d(), option_e(), option_f()]

# ─── contact sheet: big AND at real home-screen size ────────────────────────
# An icon that only works at 1024 is no icon at all, so each is shown at the
# size it will actually be tapped.
PAD, BIG, SMALL = 40, 300, 60
sheet_w = PAD + 6 * (BIG + PAD)
sheet_h = PAD + BIG + 30 + SMALL + 70
sheet = Image.new("RGB", (sheet_w, sheet_h), (245, 245, 245))
sd = ImageDraw.Draw(sheet)
label = ImageFont.truetype(F_BOLD, 26)
small_label = ImageFont.truetype(F_SEMI, 20)

for i, (im, nm) in enumerate(zip(imgs, names)):
    x = PAD + i * (BIG + PAD)
    sheet.paste(im.resize((BIG, BIG), Image.LANCZOS), (x, PAD))
    sd.text((x, PAD + BIG + 8), nm.split("-")[0], font=label, fill=(20, 20, 20))
    sheet.paste(im.resize((SMALL, SMALL), Image.LANCZOS), (x, PAD + BIG + 46))
    sd.text((x + SMALL + 12, PAD + BIG + 58), "actual size", font=small_label,
            fill=(120, 120, 120))

sheet.save(f"{OUT}/_ALL-OPTIONS.png")

for nm in names:
    p = f"{OUT}/{nm}.png"
    im = Image.open(p)
    assert im.size == (S, S) and im.mode == "RGB", (nm, im.size, im.mode)
print(f"{len(names)} icons written to {OUT}, all 1024x1024 RGB with no alpha")
