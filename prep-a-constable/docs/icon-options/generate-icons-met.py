"""
App Store icon concepts, round 2 — Metropolitan Police palette.

Deliberately NOT using the Met crest, the Met wordmark, or anything that could
read as official. The crest is a protected emblem and claiming official status
is an App Store guideline 5.2 rejection. Colours and the Sillitoe chequer are
generic police visual language and are fine; the badge is not.

Palette:
  Met signage / vehicle blue, which is brighter and more saturated than the
  app's interface navy; the blue-and-white Sillitoe chequer worn on caps; and
  battenburg fluorescent yellow from vehicle markings.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/user/amarah/prep-a-constable/docs/icon-options"
os.makedirs(OUT, exist_ok=True)

FD = "/tmp/claude-0/fonts/node_modules/@expo-google-fonts/fraunces"
F_SEMI_IT = f"{FD}/600SemiBold_Italic/Fraunces_600SemiBold_Italic.ttf"
F_BOLD_IT = f"{FD}/700Bold_Italic/Fraunces_700Bold_Italic.ttf"
F_SEMI = f"{FD}/600SemiBold/Fraunces_600SemiBold.ttf"
F_BOLD = f"{FD}/700Bold/Fraunces_700Bold.ttf"

MET_BLUE = (0x0B, 0x33, 0x8C)        # signage / vehicle blue
MET_BLUE_MID = (0x12, 0x40, 0xA3)
MET_BLUE_DEEP = (0x06, 0x1E, 0x57)
HIVIS = (0xD7, 0xE2, 0x00)           # battenburg fluorescent yellow
VEHICLE_YELLOW = (0xFF, 0xCE, 0x00)  # vehicle lettering yellow
WHITE = (0xFF, 0xFF, 0xFF)

S, SS = 1024, 4
W = S * SS


def bez(p0, p1, p2, p3, steps=60):
    out = []
    for i in range(steps + 1):
        t = i / steps; u = 1 - t
        out.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
    return out


def shield_points(cx, cy, w, h):
    sx, sy = w / 40.0, h / 46.0
    ox, oy = cx - w / 2, cy - h / 2
    P = lambda x, y: (ox + x * sx, oy + y * sy)
    pts = [P(20, 2), P(36, 7), P(36, 22)]
    pts += [P(x, y) for x, y in bez((36, 22), (36, 33), (28, 41), (20, 44))]
    pts += [P(x, y) for x, y in bez((20, 44), (12, 41), (4, 33), (4, 22))]
    return pts + [P(4, 7)]


def vgrad(img, top, bottom):
    d = ImageDraw.Draw(img)
    for y in range(img.height):
        t = y / max(1, img.height - 1)
        d.line([(0, y), (img.width, y)],
               fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))


def sillitoe(d, x, y, w, h, cols, a, b, rows=2):
    """The cap band: offset rows, which is what makes it read as police."""
    cw, ch = w / cols, h / rows
    for r in range(rows):
        for c in range(cols + 1):
            d.rectangle([x + c*cw - (cw/2 if r % 2 else 0), y + r*ch,
                         x + (c+1)*cw - (cw/2 if r % 2 else 0), y + (r+1)*ch],
                        fill=a if (r + c) % 2 == 0 else b)


def centred(d, text, font, cx, cy, fill):
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    d.text((cx - (r + l) / 2, cy - (b + t) / 2), text, font=font, fill=fill)


def finish(img, name):
    img = img.resize((S, S), Image.LANCZOS).convert("RGB")
    img.save(f"{OUT}/{name}.png")
    return img


# ─── G — Sillitoe cap band, the most recognisable police mark there is ──────
def g():
    img = Image.new("RGB", (W, W)); vgrad(img, MET_BLUE_MID, MET_BLUE)
    d = ImageDraw.Draw(img)
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.40)), W/2, W*0.36, WHITE)
    sillitoe(d, 0, W*0.66, W, W*0.19, 7, WHITE, MET_BLUE_DEEP)
    return finish(img, "G-sillitoe")


# ─── H — battenburg, blue and hi-vis ───────────────────────────────────────
def h():
    img = Image.new("RGB", (W, W)); vgrad(img, MET_BLUE_MID, MET_BLUE)
    d = ImageDraw.Draw(img)
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.40)), W/2, W*0.36, WHITE)
    bw = W / 5
    for i in range(5):
        d.rectangle([i*bw, W*0.68, (i+1)*bw, W*0.85],
                    fill=HIVIS if i % 2 == 0 else MET_BLUE_DEEP)
    return finish(img, "H-battenburg")


# ─── I — hi-vis PC on Met blue. Maximum contrast, unmistakably police ──────
def i():
    img = Image.new("RGB", (W, W)); vgrad(img, MET_BLUE_MID, MET_BLUE_DEEP)
    d = ImageDraw.Draw(img)
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.52)), W/2, W*0.45, HIVIS)
    d.rectangle([W*0.32, W*0.705, W*0.68, W*0.725], fill=WHITE)
    return finish(img, "I-hivis-type")


# ─── J — shield in Met blue, white chequer across it ───────────────────────
def j():
    img = Image.new("RGB", (W, W)); vgrad(img, MET_BLUE_MID, MET_BLUE)
    d = ImageDraw.Draw(img)
    pts = shield_points(W/2, W*0.48, W*0.68, W*0.78)
    inner = Image.new("RGB", (W, W)); vgrad(inner, MET_BLUE, MET_BLUE_DEEP)
    sillitoe(ImageDraw.Draw(inner), 0, W*0.60, W, W*0.11, 6, WHITE, MET_BLUE_DEEP, rows=1)
    mask = Image.new("L", (W, W), 0); ImageDraw.Draw(mask).polygon(pts, fill=255)
    img.paste(inner, (0, 0), mask)
    d.line(pts + [pts[0]], fill=WHITE, width=int(W*0.014), joint="curve")
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.28)), W/2, W*0.40, HIVIS)
    return finish(img, "J-met-shield")


# ─── K — hi-vis ground. Loud, and nothing else on a home screen looks like it ─
def k():
    img = Image.new("RGB", (W, W), HIVIS)
    d = ImageDraw.Draw(img)
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.46)), W/2, W*0.38, MET_BLUE)
    sillitoe(d, 0, W*0.70, W, W*0.17, 7, MET_BLUE, WHITE)
    return finish(img, "K-hivis-ground")


# ─── L — vehicle livery: blue field, yellow lettering ──────────────────────
def l():
    img = Image.new("RGB", (W, W)); vgrad(img, MET_BLUE, MET_BLUE_DEEP)
    d = ImageDraw.Draw(img)
    sillitoe(d, 0, 0, W, W*0.115, 7, WHITE, MET_BLUE_DEEP)
    centred(d, "PC", ImageFont.truetype(F_SEMI_IT, int(W*0.48)), W/2, W*0.55,
            VEHICLE_YELLOW)
    return finish(img, "L-vehicle-livery")


names = ["G-sillitoe", "H-battenburg", "I-hivis-type",
         "J-met-shield", "K-hivis-ground", "L-vehicle-livery"]
imgs = [g(), h(), i(), j(), k(), l()]

PAD, BIG, SMALL = 40, 300, 60
sheet = Image.new("RGB", (PAD + 6*(BIG+PAD), PAD + BIG + 30 + SMALL + 70),
                  (245, 245, 245))
sd = ImageDraw.Draw(sheet)
lab = ImageFont.truetype(F_BOLD, 26)
slab = ImageFont.truetype(F_SEMI, 20)
for n, (im, nm) in enumerate(zip(imgs, names)):
    x = PAD + n*(BIG+PAD)
    sheet.paste(im.resize((BIG, BIG), Image.LANCZOS), (x, PAD))
    sd.text((x, PAD+BIG+8), nm.split("-")[0], font=lab, fill=(20, 20, 20))
    sheet.paste(im.resize((SMALL, SMALL), Image.LANCZOS), (x, PAD+BIG+46))
    sd.text((x+SMALL+12, PAD+BIG+58), "actual size", font=slab, fill=(120, 120, 120))
sheet.save(f"{OUT}/_ALL-MET-COLOURS.png")

for nm in names:
    im = Image.open(f"{OUT}/{nm}.png")
    assert im.size == (S, S) and im.mode == "RGB", (nm, im.size, im.mode)
print(f"{len(names)} Met-palette icons written, all 1024x1024 RGB no alpha")
