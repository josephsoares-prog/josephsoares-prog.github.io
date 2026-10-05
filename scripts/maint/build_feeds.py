#!/usr/bin/env python3
"""Regenerate /feed.xml and /feed-fr.xml for josephsoares.com from the pages themselves.

Usage:  python3 scripts/maint/build_feeds.py [repo_root] [--check]

Each item's title, description, pubDate and enclosure come from that page's own
<title>, meta description, JSON-LD datePublished and og:image. --check reports
what would change without writing. Validated 2026-10-05 by reproducing the
then-live item sets field-for-field before any change was applied.
"""
import sys, os, datetime
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rails

BASE = 'https://josephsoares.com/'
CAP = 60
# Hub, index and book pages are never feed items.
EXCLUDE = {'index.html', 'accueil.html', 'intelligence.html', 'intelligence-fr.html',
           'book.html', 'livre.html'}
SKIP_DIRS = {'brief/archive-data', 'scripts'}

CHANNEL = {
 'en': dict(file='feed.xml', lang='en', language='en-CA', link=BASE,
            title='Corridor Intelligence — Joseph Soares',
            description='How power, capital and resources actually move. '
                        'The Corridor Brief, dispatches and analysis.'),
 'fr': dict(file='feed-fr.xml', lang='fr', language='fr-CA', link=BASE + 'accueil.html',
            title='Corridor Intelligence — Joseph Soares (français)',
            description='Comment le pouvoir, le capital et les ressources circulent vraiment. '
                        'Le Corridor Brief, les dépêches et les analyses.'),
}
COPYRIGHT = '© 2026 Joseph Soares / IBPROM Corp.'
EDITOR = 'info@josephsoares.com (Joseph Soares)'
GENERATOR = 'Static feed, regenerated on publish'


def candidates(pages, lang, today):
    out = []
    for key, p in pages.items():
        base = key.rsplit('/', 1)[-1]
        if not p['date'] or p['date'] > today:      # never publish a future-dated item
            continue
        if not p['lang'].startswith(lang):
            continue
        if base in EXCLUDE or 'noindex' in p['robots']:
            continue
        if not p['title'] or not p['desc']:
            continue
        out.append({'url': BASE + key, 'title': p['title'], 'desc': p['desc'],
                    'date': p['date'], 'ogimage': p['ogimage'], 'path': key})
    out.sort(key=lambda x: (x['date'], x['path']), reverse=True)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    root = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
    root = os.path.normpath(root)
    today = datetime.date.today().isoformat()
    pages = rails.scan(root, SKIP_DIRS)
    now = rails.rfc822_now()
    changed = []
    for key, cfg in CHANNEL.items():
        path = os.path.join(root, cfg['file'])
        items = candidates(pages, cfg['lang'], today)[:CAP]
        chan = dict(title=cfg['title'], link=cfg['link'], self=BASE + cfg['file'],
                    description=cfg['description'], language=cfg['language'],
                    copyright=COPYRIGHT, editor=EDITOR, lastBuildDate=now,
                    generator=GENERATOR)
        if os.path.exists(path):      # keep the channel wording already published
            ch = ET.parse(path).getroot().find('channel')
            for tag, k in (('title', 'title'), ('description', 'description')):
                if ch.findtext(tag):
                    chan[k] = ch.findtext(tag)
            old = [i.findtext('link') for i in ET.parse(path).getroot().iter('item')]
        else:
            old = []
        xml = rails.build_feed(items, chan, CAP)
        ET.fromstring(xml)            # a malformed feed is worse than a stale one
        new = [i['url'] for i in items]
        if new == old:
            print(f'{cfg["file"]}: no change ({len(new)} items)')
            continue
        changed.append(cfg['file'])
        print(f'{cfg["file"]}: {len(old)} -> {len(new)} items; '
              f'+{len([x for x in new if x not in old])} -{len([x for x in old if x not in new])}')
        for x in new:
            if x not in old: print('   + ' + x)
        for x in old:
            if x not in new: print('   - ' + x)
        if not check:
            open(path, 'w', encoding='utf-8').write(xml)
    print('changed:', changed or 'nothing')
    return 0


if __name__ == '__main__':
    sys.exit(main())
