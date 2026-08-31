#!/usr/bin/env python3
"""Rebuild the permanent Corridor Brief archive from every edition on disk.
Outputs editions.json, stories.json, stories.csv into brief/archive-data/.
Never prunes: captures full history regardless of what the live listing shows.
STDLIB ONLY (no bs4) so it runs in any fresh session with zero installs."""
import glob, json, csv, re, os, sys
from html import unescape

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'brief', 'archive-data')

def attr(tag_html, name):
    m = re.search(name + r'="([^"]*)"', tag_html)
    return unescape(m.group(1)) if m else ''

def text_of(fragment):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', fragment)).strip()

editions = []; stories = []
for path in sorted(glob.glob(os.path.join(ROOT, 'brief', '20[0-9][0-9]-*.html'))):
    date = os.path.basename(path)[:-5]
    html = open(path, encoding='utf-8').read()
    crumb = re.search(r'class="crumb".*?(<span[^>]*data-en="[^"]*"[^>]*>)', html, re.S)
    long_en = attr(crumb.group(1), 'data-en') if crumb else date
    long_fr = attr(crumb.group(1), 'data-fr') if crumb else date
    items = re.findall(r'<article class="cb-item">(.*?)</article>', html, re.S)
    lead_en = lead_fr = ''
    for block in items:
        rank = int(re.search(r'<div class="cb-rank">\s*(\d+)\s*</div>', block).group(1))
        tag_m = re.search(r'(<span class="cb-tag"[^>]*>)', block)
        hl_m = re.search(r'<h2 class="cb-headline">\s*(<a[^>]*>)', block)
        src_m = re.search(r'<a class="cb-source"[^>]*>(.*?)</a>', block, re.S)
        bluf_m = re.search(r'(<p class="cb-bluf"[^>]*>)', block)
        st = unescape(text_of(src_m.group(1))) if src_m else ''
        m = re.match(r'(.+?)\s*·\s*([^\s]+)', st)
        row = {'date': date, 'long_en': long_en, 'rank': rank,
               'tag_en': attr(tag_m.group(1), 'data-en') if tag_m else '',
               'tag_fr': attr(tag_m.group(1), 'data-fr') if tag_m else '',
               'headline_en': attr(hl_m.group(1), 'data-en') if hl_m else '',
               'headline_fr': attr(hl_m.group(1), 'data-fr') if hl_m else '',
               'outlet': m.group(1).strip() if m else '',
               'domain': m.group(2).strip() if m else '',
               'url': attr(hl_m.group(1), 'href') if hl_m else '',
               'bluf_en': attr(bluf_m.group(1), 'data-en') if bluf_m else '',
               'bluf_fr': attr(bluf_m.group(1), 'data-fr') if bluf_m else ''}
        stories.append(row)
        if rank == 1:
            lead_en, lead_fr = row['headline_en'], row['headline_fr']
    editions.append({'date': date, 'long_en': long_en, 'long_fr': long_fr, 'count': len(items),
                     'lead_en': lead_en, 'lead_fr': lead_fr, 'url': f'/brief/{date}.html'})

editions.sort(key=lambda e: e['date'], reverse=True)
stories.sort(key=lambda s: (s['date'], s['rank']))
json.dump(editions, open(os.path.join(OUT, 'editions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(stories, open(os.path.join(OUT, 'stories.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
cols = ['date', 'long_en', 'rank', 'tag_en', 'headline_en', 'outlet', 'domain', 'url', 'bluf_en', 'tag_fr', 'headline_fr', 'bluf_fr']
with open(os.path.join(OUT, 'stories.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
    for s in stories: w.writerow({k: s.get(k, '') for k in cols})

# Self-check: the newest edition on disk must be present in the rebuilt data.
newest = max(e['date'] for e in editions) if editions else ''
newest_story = max(s['date'] for s in stories) if stories else ''
if not editions or newest != newest_story:
    print(f'ARCHIVE SELF-CHECK FAILED: newest edition {newest} vs newest story {newest_story}', file=sys.stderr)
    sys.exit(1)
print(f'archive rebuilt: {len(editions)} editions, {len(stories)} stories, through {newest}')
