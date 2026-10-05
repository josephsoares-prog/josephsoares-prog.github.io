#!/usr/bin/env python3
"""Report sitemap gaps for a static site in this repo family.

Usage:  python3 scripts/maint/sitemap_gap.py <repo_root> <site_base_url> [skip_dir ...]

Prints, for that repo: live indexable .html pages absent from sitemap.xml, and
sitemap URLs that are not indexable (noindex, or canonical pointing elsewhere,
or disallowed in robots.txt) and so should not be submitted. Read-only.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rails


def robots_disallow(root):
    pats, cur_all = [], False
    try:
        for line in open(os.path.join(root, 'robots.txt'), encoding='utf-8'):
            line = line.split('#')[0].strip()
            if not line:
                continue
            k, _, v = line.partition(':')
            k, v = k.strip().lower(), v.strip()
            if k == 'user-agent':
                cur_all = (v == '*')
            elif k == 'disallow' and cur_all and v:
                pats.append(v)
    except OSError:
        pass
    return pats


def indexable(key, meta, base, disallow):
    b = key.rsplit('/', 1)[-1]
    if b == '404.html':
        return False, '404 page'
    if re.fullmatch(r'google[0-9a-f]+\.html', b):
        return False, 'search-console verification file'
    if 'noindex' in meta['robots']:
        return False, 'noindex'
    can = meta['canonical']
    if can:
        want = base + key
        alt = base + key[:-len('index.html')] if key.endswith('index.html') else want
        if can.rstrip('/') not in (want.rstrip('/'), alt.rstrip('/')):
            return False, f'canonical -> {can}'
    for d in disallow:
        if ('/' + key).startswith(d):
            return False, f'robots.txt disallow {d}'
    return True, ''


def main():
    if len(sys.argv) < 3:
        print(__doc__); return 2
    root, base = os.path.normpath(sys.argv[1]), sys.argv[2].rstrip('/') + '/'
    skip = set(sys.argv[3:]) | {'scripts'}
    pages = rails.scan(root, skip)
    disallow = robots_disallow(root)
    sm = open(os.path.join(root, 'sitemap.xml'), encoding='utf-8').read()
    locs = set(re.findall(r'<loc>([^<]+)</loc>', sm))
    listed = set()
    for l in locs:
        k = l.replace(base, '')
        listed.add(k or 'index.html')
        if k.endswith('/'):
            listed.add(k + 'index.html')
    missing, wrong = [], []
    for k, v in sorted(pages.items()):
        ok, why = indexable(k, v, base, disallow)
        inmap = k in listed or (k.endswith('index.html') and k[:-len('index.html')] in listed)
        if ok and not inmap:
            missing.append((k, v['date']))
        if not ok and inmap:
            wrong.append((k, why))
    print(f'{root}: {len(pages)} pages, sitemap {len(locs)} urls')
    print(f'MISSING ({len(missing)}):')
    for m in missing: print('   ', m[0], m[1])
    print(f'LISTED BUT NOT INDEXABLE ({len(wrong)}):')
    for w in wrong: print('   ', w[0], '--', w[1])
    return 0


if __name__ == '__main__':
    sys.exit(main())
