#!/usr/bin/env python3
"""Brand-stamp a hero image with the Corridor Intelligence house mark.

Applies a bottom-right navy scrim, then renders:
  CORRIDOR INTELLIGENCE   (Oswald SemiBold, gold, tracked)
  josephsoares.com        (EB Garamond Regular, cream)

Metrics are matched to /assets/canada-pacific-pivot-pipeline-july-2026.jpg
at 1280x720. On other sizes everything scales proportionally.

Usage: python3 brand_hero.py --src IN --dest OUT [--no-scrim]
Fonts: expects Oswald SemiBold + EB Garamond Regular TTFs; pass paths via
--oswald / --garamond (defaults suit the CI workflow's npm layout).
"""
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def tracked_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def draw_tracked(draw, pos, text, font, fill, tracking):
    x, y = pos
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dest', required=True)
    ap.add_argument('--oswald', default='fonts/Oswald-SemiBold.ttf')
    ap.add_argument('--garamond', default='fonts/EBGaramond-Regular.ttf')
    ap.add_argument('--no-scrim', action='store_true')
    ap.add_argument('--quality', type=int, default=90)
    args = ap.parse_args()

    im = Image.open(args.src).convert('RGB')
    w, h = im.size
    s = w / 1280.0  # scale factor vs reference frame

    if not args.no_scrim:
        a = np.array(im).astype(float)
        yy, xx = np.mgrid[0:h, 0:w]
        dx = np.clip((xx - 760 * s) / (380 * s), 0, 1)
        dy = np.clip((yy - 545 * (h / 720.0)) / (130 * (h / 720.0)), 0, 1)
        strength = (dx ** 0.9) * (dy ** 0.9) * 0.86
        navy = np.array([7, 28, 57], dtype=float)
        a = a * (1 - strength[..., None]) + navy * strength[..., None]
        im = Image.fromarray(a.astype('uint8'))

    d = ImageDraw.Draw(im)

    # CORRIDOR INTELLIGENCE - gold, tracked to 326px @1280
    line1 = 'CORRIDOR INTELLIGENCE'
    f1 = ImageFont.truetype(args.oswald, max(1, round(26 * s)))
    bbox1 = d.textbbox((0, 0), line1, font=f1)
    tr = (326 * s - tracked_width(d, line1, f1, 0)) / (len(line1) - 1)
    w1 = tracked_width(d, line1, f1, tr)
    right_x = 1242 * s
    draw_tracked(d, (right_x - w1, 629 * (h / 720.0) - bbox1[1]),
                 line1, f1, (232, 207, 111), tr)

    # josephsoares.com - cream
    line2 = 'josephsoares.com'
    f2 = ImageFont.truetype(args.garamond, max(1, round(24 * s)))
    w2 = d.textlength(line2, font=f2)
    bbox2 = d.textbbox((0, 0), line2, font=f2)
    d.text((right_x - w2, 669 * (h / 720.0) - bbox2[1]),
           line2, font=f2, fill=(231, 233, 234))

    im.save(args.dest, quality=args.quality)
    print('branded ->', args.dest, im.size)


if __name__ == '__main__':
    main()
