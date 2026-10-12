#!/usr/bin/env python3
"""Regenerate the RSS feeds for Joseph Soares' static sites from the pages themselves.

Usage:  python3 scripts/maint/build_feeds.py [repo_root] [--site ID] [--check]

        --site josephsoares   (default)  josephsoares.com  feed.xml + feed-fr.xml, 60 items
        --site campuscorridor            campuscorridor.ca feed.xml + feed-fr.xml, 50 items

One implementation serves every site; a site is a configuration, not a copy of
this file. Each item's title, description, pubDate and enclosure come from that
page's own <title>, meta description, JSON-LD datePublished and og:image, and the
enclosure's MIME type from the image's own extension. --check reports what would
change without writing.

Validated 2026-10-05 (josephsoares) and 2026-10-12 (campuscorridor) by
reproducing the then-live item sets field-for-field before any change was applied.
"""
import sys, os, datetime
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rails

SITES = {
 'josephsoares': dict(
    base='https://josephsoares.com/', cap=60, tiebreak='desc',
    # Hub, index and book pages are never feed items.
    exclude={'index.html', 'accueil.html', 'intelligence.html', 'intelligence-fr.html',
             'book.html', 'livre.html'},
    skip_dirs={'brief/archive-data', 'scripts'},
    prefix='',
    copyright='© 2026 Joseph Soares / IBPROM Corp.',
    editor='info@josephsoares.com (Joseph Soares)',
    channels={
      'en': dict(file='feed.xml', lang='en', language='en-CA', link='https://josephsoares.com/',
                 title='Corridor Intelligence — Joseph Soares',
                 description='How power, capital and resources actually move. '
                             'The Corridor Brief, dispatches and analysis.'),
      'fr': dict(file='feed-fr.xml', lang='fr', language='fr-CA',
                 link='https://josephsoares.com/accueil.html',
                 title='Corridor Intelligence — Joseph Soares (français)',
                 description='Comment le pouvoir, le capital et les ressources circulent vraiment. '
                             'Le Corridor Brief, les dépêches et les analyses.'),
    }),
 'campuscorridor': dict(
    base='https://campuscorridor.ca/', cap=50, tiebreak='asc',
    exclude={'index.html', 'accueil.html'},
    skip_dirs={'i18n', 'js', 'images', 'photos', 'Logos'},
    prefix='blog/',          # the Journal feed carries blog articles only
    copyright='© 2026 Capital Corridor Campus',
    editor='info@campuscorridor.ca (Capital Corridor Campus)',
    channels={
      'en': dict(file='feed.xml', lang='en', language='en-CA',
                 link='https://campuscorridor.ca/blog/',
                 title='Capital Corridor Campus — Journal',
                 description='Commercial real estate, virtual offices and the federal '
                             'corridor in Gatineau-Ottawa.'),
      'fr': dict(file='feed-fr.xml', lang='fr', language='fr-CA',
                 link='https://campuscorridor.ca/blog/',
                 title='Capital Corridor Campus — Journal (français)',
                 description='Immobilier commercial, bureaux virtuels et corridor fédéral '
                             'à Gatineau-Ottawa.'),
    }),
}
GENERATOR = 'Static feed, regenerated on publish'


def candidates(pages, cfg, lang, today):
    out = []
    for key, p in pages.items():
        base = key.rsplit('/', 1)[-1]
        if cfg['prefix'] and not key.startswith(cfg['prefix']):
            continue
        if not p['date'] or p['date'] > today:      # never publish a future-dated item
            continue
        if not p['lang'].startswith(lang):
            continue
        if base in cfg['exclude'] or 'noindex' in p['robots']:
            continue
        if not p['title'] or not p['desc']:
            continue
        out.append({'url': cfg['base'] + key, 'title': p['title'], 'desc': p['desc'],
                    'date': p['date'], 'ogimage': p['ogimage'], 'path': key})
    # Newest first. The same-date tiebreak is per-site, because each site's
    # published feed already carries one and re-sorting it would be churn, not
    # an improvement. Deterministic: same inputs -> same bytes.
    out.sort(key=lambda x: x['path'], reverse=(cfg['tiebreak'] == 'desc'))
    out.sort(key=lambda x: x['date'], reverse=True)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    site = 'josephsoares'
    for i, a in enumerate(sys.argv):
        if a == '--site' and i + 1 < len(sys.argv):
            site = sys.argv[i + 1]
        elif a.startswith('--site='):
            site = a.split('=', 1)[1]
    args = [a for a in args if a != site]
    if site not in SITES:
        print(f'unknown --site {site!r}; known: {", ".join(SITES)}')
        return 2
    cfg = SITES[site]
    root = args[0] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
    root = os.path.normpath(root)
    today = datetime.date.today().isoformat()
    pages = rails.scan(root, cfg['skip_dirs'])
    now = rails.rfc822_now()
    changed = []
    for key, ch_cfg in cfg['channels'].items():
        path = os.path.join(root, ch_cfg['file'])
        items = candidates(pages, cfg, ch_cfg['lang'], today)[:cfg['cap']]
        chan = dict(title=ch_cfg['title'], link=ch_cfg['link'],
                    self=cfg['base'] + ch_cfg['file'],
                    description=ch_cfg['description'], language=ch_cfg['language'],
                    copyright=cfg['copyright'], editor=cfg['editor'],
                    lastBuildDate=now, generator=GENERATOR)
        if os.path.exists(path):      # keep the channel wording already published
            ch = ET.parse(path).getroot().find('channel')
            for tag, k in (('title', 'title'), ('description', 'description')):
                if ch.findtext(tag):
                    chan[k] = ch.findtext(tag)
            old = [i.findtext('link') for i in ET.parse(path).getroot().iter('item')]
        else:
            old = []
        xml = rails.build_feed(items, chan, cfg['cap'])
        ET.fromstring(xml)            # a malformed feed is worse than a stale one
        new = [i['url'] for i in items]
        if new == old:
            print(f'{site}/{ch_cfg["file"]}: no change ({len(new)} items)')
            continue
        changed.append(ch_cfg['file'])
        print(f'{site}/{ch_cfg["file"]}: {len(old)} -> {len(new)} items; '
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
