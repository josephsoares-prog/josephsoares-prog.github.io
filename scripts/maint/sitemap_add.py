#!/usr/bin/env python3
"""Insert missing indexable pages into a hand-curated sitemap.xml. Insert-only.

Usage:  python3 scripts/maint/sitemap_add.py <repo_root> <base_url> [--apply] [skip_dir ...]

sitemap.xml is hand-curated — tiers, changefreq, priority and comments carry
editorial meaning, so this never regenerates it, never reorders it and never
removes an entry. It finds the pages sitemap_gap.py reports as missing and
splices them in beside the nearest existing sibling, copying that sibling's
changefreq and priority so a new Corridor Brief inherits the shape the block
already uses. Everything else in the file is preserved byte-for-byte.

An xhtml:link hreflang annotation is written only when the page declares two or
more real alternates, none of them a ?lang= query-string URL, and the pair is
reciprocal and self-referential. Anything short of that gets no annotation:
a non-reciprocal pair is ignored by Google, so a guessed one buys nothing.

Default is a dry run; --apply writes. Parses its own output before writing.
"""
import sys, os, re, datetime
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rails, sitemap_gap

NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'


def alternates(key, meta, base, pages):
    """Return [(hreflang, href)] only for a verified reciprocal, self-referential set."""
    alts = {k: v for k, v in (meta.get('alts') or {}).items()}
    if len(alts) < 2:
        return []
    if any('?' in v or 'lang=' in v for v in alts.values()):
        return []                                   # never propagate a ?lang= alternate
    me = base + key
    if not any(v.rstrip('/') == me.rstrip('/') for v in alts.values()):
        return []                                   # must declare itself
    for href in set(alts.values()):
        other = href.replace(base, '')
        if other == key:
            continue
        if other not in pages:
            return []
        back = pages[other].get('alts') or {}
        if not any(v.rstrip('/') == me.rstrip('/') for v in back.values()):
            return []                               # target must point back
    return sorted(alts.items())


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply = '--apply' in sys.argv
    if len(argv) < 2:
        print(__doc__); return 2
    root, base = os.path.normpath(argv[0]), argv[1].rstrip('/') + '/'
    skip = set(argv[2:]) | {'scripts'}
    pages = rails.scan(root, skip)
    disallow = sitemap_gap.robots_disallow(root)
    path = os.path.join(root, 'sitemap.xml')
    src = open(path, encoding='utf-8').read()
    today = datetime.date.today().isoformat()

    listed = set()
    for l in re.findall(r'<loc>([^<]+)</loc>', src):
        k = l.replace(base, '')
        listed.add(k or 'index.html')
        if k.endswith('/'):
            listed.add(k + 'index.html')

    missing = []
    for k, v in sorted(pages.items()):
        ok, _ = sitemap_gap.indexable(k, v, base, disallow)
        inmap = k in listed or (k.endswith('index.html') and k[:-len('index.html')] in listed)
        if ok and not inmap:
            if v['date'] and v['date'] > today:
                print(f'  skip (future-dated {v["date"]}): {k}')
                continue
            missing.append(k)
    if not missing:
        print(f'{root}: sitemap complete ({len(listed)} listed, {len(pages)} pages)')
        return 0

    # Group inserts by the <url> block they follow: the listed sibling sharing the
    # longest path prefix with the newcomer, so a brief lands in the brief block.
    blocks = list(re.finditer(r'[ \t]*<url>.*?</url>\n', src, re.S))
    added = 0
    for key in missing:
        d = key.rsplit('/', 1)[0] if '/' in key else ''
        best, best_end, best_txt = -1, None, None
        for b in blocks:
            m = re.search(r'<loc>([^<]+)</loc>', b.group(0))
            if not m:
                continue
            ok = m.group(1).replace(base, '')
            od = ok.rsplit('/', 1)[0] if '/' in ok else ''
            if od != d:
                continue
            score = len(os.path.commonprefix([ok, key]))
            if score >= best:                       # last match wins -> end of block
                best, best_end, best_txt = score, b.end(), b.group(0)
        if best_end is None:
            print(f'  NO SIBLING BLOCK, left for hand placement: {key}')
            continue
        cf = re.search(r'<changefreq>([^<]+)</changefreq>', best_txt)
        pr = re.search(r'<priority>([^<]+)</priority>', best_txt)
        lastmod = pages[key]['date'] or today
        lines = ['  <url>', f'    <loc>{base}{key}</loc>', f'    <lastmod>{lastmod}</lastmod>']
        if cf: lines.append(f'    <changefreq>{cf.group(1)}</changefreq>')
        if pr: lines.append(f'    <priority>{pr.group(1)}</priority>')
        for hl, href in alternates(key, pages[key], base, pages):
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{href}"/>')
        lines.append('  </url>')
        entry = '\n'.join(lines) + '\n'
        src = src[:best_end] + entry + src[best_end:]
        blocks = list(re.finditer(r'[ \t]*<url>.*?</url>\n', src, re.S))
        added += 1
        print(f'  + {base}{key}  lastmod {lastmod}')

    root_el = ET.fromstring(src)                    # malformed sitemap is worse than a gap
    n = len(root_el.findall(f'{{{NS}}}url'))
    print(f'{root}: +{added} entries, {n} <url> total, parses clean')
    if apply:
        open(path, 'w', encoding='utf-8').write(src)
        print('written')
    else:
        print('dry run — pass --apply to write')
    return 0


if __name__ == '__main__':
    sys.exit(main())
