#!/usr/bin/env python3
"""Close sitemap gaps for a static site in this repo family.

Usage: python3 scripts/maint/sitemap_add.py <repo_root> <site_base_url>
                [--skip DIR]... [--check]

Adds every live, indexable .html page that sitemap.xml is missing, using the
page's own JSON-LD datePublished as <lastmod>, and inserts it beside the pages
it belongs with so the file keeps its existing grouping and ordering.
<changefreq> and <priority> are inherited from the nearest sibling in the same
directory group, so a new /brief/ edition is listed exactly like every edition
before it.

hreflang annotations are written ONLY for a page that declares two or more
REAL alternates: a query-string alternate (the pre-SOP ?lang= mechanism) is
never propagated, and the set must be self-referential and reciprocal before
anything is written. Google treats a non-reciprocal annotation as untrusted,
so a wrong one is worse than none.

Companion to sitemap_gap.py, which reports the same gaps read-only; this writes
them. --check prints the diff without touching the file. The result is validated
with an XML parser before it is written -- a malformed sitemap is worse than an
incomplete one.
"""
import sys, os, re, datetime
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rails, sitemap_gap

SM = 'sitemap.xml'


def group_of(key):
    """Pages are grouped by directory: 'brief/2026-10-19.html' -> 'brief/'."""
    return key.rsplit('/', 1)[0] + '/' if '/' in key else ''


def real_alts(key, meta, base, pages):
    """Alternates safe to annotate, or {} when the set cannot be trusted.

    Returns {} unless the page declares two or more alternates that resolve to
    DISTINCT real URLs, are self-referential, and are reciprocated by every
    twin. Three traps this has to refuse, because a false annotation is worse
    than none:
      * any query-string alternate (the pre-SOP ?lang= mechanism) -- the page
        is refused whole rather than annotated from what is left, because the
        remainder no longer describes the pair the page meant to declare;
      * a set whose real languages all point at the same URL, which asserts a
        translation that does not exist (158 of campuscorridor.ca's 178 pages
        do this; it is reported, never auto-written -- Joseph's call);
      * a twin that does not point back.
    """
    alts = {l: u for l, u in meta['alts'].items() if u}
    if any('?' in u for u in alts.values()):
        return {}
    if len(alts) < 2:
        return {}
    self_url = base + key
    langs = {l: u for l, u in alts.items() if l != 'x-default'}
    if len({u.rstrip('/') for u in langs.values()}) < 2:
        return {}
    if not any(u.rstrip('/') == self_url.rstrip('/') for u in alts.values()):
        return {}                                     # not self-referential
    for lang, url in alts.items():
        if lang == 'x-default' or url.rstrip('/') == self_url.rstrip('/'):
            continue
        twin = url.replace(base, '')
        if twin not in pages:
            return {}                                 # points outside the repo
        back = {u for u in pages[twin]['alts'].values() if u}
        if not any(u.rstrip('/') == self_url.rstrip('/') for u in back):
            return {}                                 # not reciprocal
    return alts


def block(key, meta, base, pages, freq, prio):
    url = base + key
    out = ['  <url>', f'    <loc>{url}</loc>']
    if meta['date']:
        out.append(f'    <lastmod>{meta["date"]}</lastmod>')
    if freq:
        out.append(f'    <changefreq>{freq}</changefreq>')
    if prio:
        out.append(f'    <priority>{prio}</priority>')
    for lang, href in sorted(real_alts(key, meta, base, pages).items()):
        out.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{href}"/>')
    out.append('  </url>')
    return '\n'.join(out) + '\n'


def main():
    argv = sys.argv[1:]
    check = '--check' in argv
    argv = [a for a in argv if a != '--check']
    skip = set()
    while '--skip' in argv:
        i = argv.index('--skip'); skip.add(argv[i + 1]); del argv[i:i + 2]
    if len(argv) < 2:
        print(__doc__); return 2
    root, base = os.path.normpath(argv[0]), argv[1].rstrip('/') + '/'
    pages = rails.scan(root, skip | {'scripts'})
    disallow = sitemap_gap.robots_disallow(root)
    path = os.path.join(root, SM)
    src = open(path, encoding='utf-8').read()

    blocks = list(re.finditer(r'[ \t]*<url>.*?</url>\n?', src, re.S))
    listed = set()
    for b in blocks:
        for loc in re.findall(r'<loc>([^<]+)</loc>', b.group(0)):
            k = loc.replace(base, '')
            listed.add(k or 'index.html')
            if k.endswith('/'):
                listed.add(k + 'index.html')

    missing = []
    for k, v in sorted(pages.items()):
        ok, _ = sitemap_gap.indexable(k, v, base, disallow)
        inmap = k in listed or (k.endswith('index.html') and k[:-len('index.html')] in listed)
        if ok and not inmap:
            missing.append(k)
    if not missing:
        print(f'{root}: {len(pages)} pages, sitemap {len(blocks)} urls -- no change')
        return 0

    # Insert each page after the last listed page of its own group, so the file
    # keeps the ordering a human put it in.
    inserts = {}
    for k in missing:
        g = group_of(k)
        anchor, freq, prio = None, '', ''
        for b in blocks:
            loc = re.search(r'<loc>([^<]+)</loc>', b.group(0))
            if not loc:
                continue
            lk = loc.group(1).replace(base, '')
            if group_of(lk) == g and lk.endswith('.html'):
                anchor = b
                freq = (re.search(r'<changefreq>([^<]+)', b.group(0)) or [None, ''])[1]
                prio = (re.search(r'<priority>([^<]+)', b.group(0)) or [None, ''])[1]
        at = anchor.end() if anchor else src.rindex('</urlset>')
        inserts.setdefault(at, []).append((k, freq, prio))

    new = src
    for at in sorted(inserts, reverse=True):
        text = ''.join(block(k, pages[k], base, pages, f, p)
                       for k, f, p in sorted(inserts[at]))
        new = new[:at] + text + new[at:]

    ET.fromstring(new)                 # malformed sitemap is worse than an incomplete one
    n_after = len(re.findall(r'<loc>', new))
    print(f'{root}: sitemap {len(blocks)} -> {n_after} urls; +{len(missing)}')
    for k in missing:
        a = real_alts(k, pages[k], base, pages)
        print(f'   + {base}{k}  lastmod={pages[k]["date"] or "NONE"}'
              f'  hreflang={len(a) if a else 0}')
    if not check:
        open(path, 'w', encoding='utf-8').write(new)
        print('written')
    else:
        print('check only, not written')
    return 0


if __name__ == '__main__':
    sys.exit(main())
