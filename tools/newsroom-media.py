"""Build Newsroom post images from simulator screenshots.

    python3 tools/newsroom-media.py assets/newsroom/2026/11/tappy-6-7 ~/Desktop/shots/*.png \
        --hero sorting-tray,squishy-shapes,camera,fireworks,rainbow-sort

Each PNG becomes <name>.webp (603px wide, used on the page) and
download/<post>-<name>.jpg (full size, linked from "Download"), where <name> is the
PNG's file name and <post> is the output folder's name.

--hero takes 3, 5 or 7 screen names, left to right; the middle one is drawn largest.
It writes hero.webp (article and index), hero-og.jpg (social previews) and
download/<post>-hero.jpg. Everything in download/ is then zipped into
<post>-media.zip for "Download all media".

Requires Pillow: pip3 install pillow
"""

import argparse
import os
import zipfile

from PIL import Image, ImageDraw, ImageFilter

PAGE_WIDTH = 603
HERO_SIZE = (2400, 1350)
HERO_LAYOUTS = {
    3: [(500, 640, 420), (500, 1760, 420), (570, 1200, 220)],
    5: [(430, 315, 560), (430, 2085, 560), (490, 750, 390), (490, 1650, 390), (570, 1200, 220)],
    7: [(370, 95, 660), (370, 2305, 660), (410, 420, 530), (410, 1980, 530),
        (460, 790, 390), (460, 1610, 390), (540, 1200, 230)],
}
HERO_ORDER = {3: [0, 2, 1], 5: [0, 4, 1, 3, 2], 7: [0, 6, 1, 5, 2, 4, 3]}


def save_screen(src, name, out, post):
    im = Image.open(src).convert('RGB')
    im.save(os.path.join(out, 'download', f'{post}-{name}.jpg'), quality=90, optimize=True, progressive=True)
    height = round(im.height * PAGE_WIDTH / im.width)
    im.resize((PAGE_WIDTH, height), Image.LANCZOS).save(os.path.join(out, f'{name}.webp'), quality=86, method=6)


def rounded_mask(size, radius, scale=4):
    w, h = size
    big = Image.new('L', (w * scale, h * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), radius * scale, fill=255)
    return big.resize(size, Image.LANCZOS)


def phone(src, width):
    bezel = round(width * 0.03)
    screen_w = width - bezel * 2
    shot = Image.open(src).convert('RGB')
    screen_h = round(shot.height * screen_w / shot.width)
    shot = shot.resize((screen_w, screen_h), Image.LANCZOS)
    height = screen_h + bezel * 2
    outer_r = round(width * 0.17)

    frame = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    body = Image.new('RGBA', (width, height), (11, 11, 13, 255))
    frame.paste(body, (0, 0), rounded_mask((width, height), outer_r))
    frame.paste(shot, (bezel, bezel), rounded_mask((screen_w, screen_h), outer_r - bezel))
    return frame


def gradient(size, stops):
    w, h = size
    base = Image.new('RGB', size)
    px = base.load()
    for y in range(h):
        for x in range(w):
            t = (x / w) * 0.65 + (y / h) * 0.35
            for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
                if t0 <= t <= t1:
                    k = (t - t0) / (t1 - t0)
                    px[x, y] = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
                    break
    return base


def dots(img, spacing=44, r=4, alpha=46):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(spacing // 2, img.height, spacing):
        for x in range(spacing // 2, img.width, spacing):
            d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, alpha))
    return Image.alpha_composite(img.convert('RGBA'), layer)


def save_hero(sources, out, post):
    W, H = HERO_SIZE
    canvas = dots(gradient((W // 4, H // 4), [
        (0.0, (108, 202, 238)),
        (0.5, (150, 176, 255)),
        (1.0, (201, 188, 255)),
    ]).resize((W, H), Image.BICUBIC))

    layout = HERO_LAYOUTS[len(sources)]
    for src, (width, cx, top) in zip((sources[i] for i in HERO_ORDER[len(sources)]), layout):
        p = phone(src, width)
        x = cx - width // 2
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            (x + 10, top + 40, x + width - 10, top + p.height + 40), round(width * 0.17), fill=(21, 51, 74, 120))
        canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(38)))
        canvas.alpha_composite(p, (x, top))

    canvas = canvas.convert('RGB')
    canvas.save(os.path.join(out, 'download', f'{post}-hero.jpg'), quality=90, optimize=True, progressive=True)
    canvas.resize((1960, round(1960 * H / W)), Image.LANCZOS).save(os.path.join(out, 'hero.webp'), quality=84, method=6)
    canvas.resize((1200, 675), Image.LANCZOS).crop((0, 0, 1200, 630)).save(
        os.path.join(out, 'hero-og.jpg'), quality=86, optimize=True, progressive=True)


def save_zip(out, post):
    downloads = os.path.join(out, 'download')
    with zipfile.ZipFile(os.path.join(out, f'{post}-media.zip'), 'w', zipfile.ZIP_STORED) as z:
        for f in sorted(os.listdir(downloads)):
            z.write(os.path.join(downloads, f), f'{post}-media/{f}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('out', help='post asset folder, e.g. assets/newsroom/2026/11/tappy-6-7')
    parser.add_argument('screens', nargs='+', help='simulator screenshots (PNG)')
    parser.add_argument('--hero', help='3, 5 or 7 comma-separated screen names, left to right')
    args = parser.parse_args()

    out = os.path.normpath(args.out)
    post = os.path.basename(out)
    os.makedirs(os.path.join(out, 'download'), exist_ok=True)

    names = {}
    for src in args.screens:
        name = os.path.splitext(os.path.basename(src))[0]
        names[name] = src
        save_screen(src, name, out, post)

    if args.hero:
        hero = args.hero.split(',')
        if len(hero) not in HERO_LAYOUTS:
            parser.error('--hero needs 3, 5 or 7 screen names')
        missing = [n for n in hero if n not in names]
        if missing:
            parser.error(f'--hero names not in the screenshots: {", ".join(missing)}')
        save_hero([names[n] for n in hero], out, post)

    save_zip(out, post)
    for root, _, files in os.walk(out):
        for f in sorted(files):
            p = os.path.join(root, f)
            print(f'{os.path.relpath(p, out):48} {os.path.getsize(p) // 1024:>6} KB')


if __name__ == '__main__':
    main()
