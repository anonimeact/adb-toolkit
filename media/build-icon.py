#!/usr/bin/env python3
"""Regenerate media/icon.png (requires Pillow)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SCALE = 4
SIZE = 128 * SCALE
CX, CY, R = SIZE // 2, SIZE // 2, 60 * SCALE
OUT = Path(__file__).resolve().parent / "icon.png"

GRAD_TL = (255, 228, 140)
GRAD_BR = (255, 155, 20)

INK = (45, 22, 8, 255)
WHITE = (255, 255, 255, 255)
SCREEN = (48, 28, 12, 255)

FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _circle_mask() -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse([CX - R, CY - R, CX + R, CY + R], fill=255)
    return mask


def _apply_circle_mask(layer: Image.Image) -> Image.Image:
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(layer, mask=_circle_mask())
    return out


def _bright_orange_gradient() -> Image.Image:
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = layer.load()
    r2 = R * R
    diag = math.hypot(2 * R, 2 * R)
    x0, y0 = CX - R, CY - R
    for y in range(SIZE):
        for x in range(SIZE):
            if (x - CX) ** 2 + (y - CY) ** 2 > r2:
                continue
            t = ((x - x0) + (y - y0)) / diag
            t = max(0.0, min(1.0, t))
            rgb = tuple(int(GRAD_TL[i] * (1 - t) + GRAD_BR[i] * t) for i in range(3))
            px[x, y] = rgb + (255,)
    return layer


def _diagonal_stripe_overlay() -> Image.Image:
    """Three equal bands along top-left → bottom-right (x + y)."""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = layer.load()
    r2 = R * R
    # Equal thirds across the circle on the TL–BR diagonal
    u_min = CX + CY - R * math.sqrt(2)
    band_w = (2 * R * math.sqrt(2)) / 3

    strip_colors = (
        (255, 255, 255, 52),
        (255, 125, 10, 34),
        (175, 72, 0, 78),
    )

    for y in range(SIZE):
        for x in range(SIZE):
            if (x - CX) ** 2 + (y - CY) ** 2 > r2:
                continue
            rel = (x + y) - u_min
            strip = min(2, max(0, int(rel / band_w)))
            px[x, y] = strip_colors[strip]

    return layer


def _sheen_highlight() -> Image.Image:
    sheen = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = sheen.load()
    r2 = R * R
    sx, sy = CX - R * 0.55, CY - R * 0.65
    for y in range(SIZE):
        for x in range(SIZE):
            if (x - CX) ** 2 + (y - CY) ** 2 > r2:
                continue
            d = math.hypot(x - sx, y - sy) / (R * 1.05)
            if d >= 1.0:
                continue
            a = int(115 * (1.0 - d) ** 1.6)
            px[x, y] = (255, 255, 245, a)
    return sheen


def make_orange_background() -> Image.Image:
    base = _bright_orange_gradient()
    stripes = _diagonal_stripe_overlay()
    combined = Image.alpha_composite(base, stripes)
    combined = Image.alpha_composite(combined, _sheen_highlight())
    return _apply_circle_mask(combined)


def draw_phone(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    pw, ph = 46 * SCALE, 76 * SCALE
    left = cx - pw // 2
    top = cy - ph // 2
    draw.rounded_rectangle(
        [left - 4, top - 4, left + pw + 4, top + ph + 4],
        radius=12,
        fill=INK,
    )
    draw.rounded_rectangle([left, top, left + pw, top + ph], radius=10, fill=WHITE)
    draw.rounded_rectangle([cx - 15, top + 11, cx + 15, top + 19], radius=5, fill=INK)

    sl, st, sw, sh = left + 8, top + 24, pw - 16, ph - 32
    draw.rounded_rectangle([sl - 2, st - 2, sl + sw + 2, st + sh + 2], radius=7, fill=INK)
    draw.rounded_rectangle([sl, st, sl + sw, st + sh], radius=6, fill=SCREEN)

    font = _load_font(17 * SCALE)
    text_y = st + sh // 2 + SCALE
    draw.text(
        (cx, text_y),
        "adb",
        font=font,
        fill=WHITE,
        anchor="mm",
        stroke_width=2,
        stroke_fill=INK,
    )


def main() -> None:
    img = make_orange_background()
    draw = ImageDraw.Draw(img)
    draw_phone(draw, CX, CY)

    final = img.resize((128, 128), Image.Resampling.LANCZOS)
    final.save(OUT, "PNG")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
