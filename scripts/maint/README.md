# Feed and sitemap rails

Shared implementation for the two rails that keep the site discoverable.
Everything is read from the pages themselves — a page's own `<title>`, meta
description, `<html lang>`, canonical, robots meta, `og:image` and JSON-LD
`datePublished`. There is no second list to keep in step.

    python3 scripts/maint/build_feeds.py . --check     # report, write nothing
    python3 scripts/maint/build_feeds.py .             # regenerate feed.xml + feed-fr.xml
    python3 scripts/maint/sitemap_gap.py . https://josephsoares.com/ brief/archive-data
    python3 scripts/maint/sitemap_add.py . https://josephsoares.com/ brief/archive-data --apply

One copy serves every site; a site is a configuration, not a fork. Run the two
campuscorridor rails from this repo against that checkout:

    python3 scripts/maint/build_feeds.py ../ccc --site campuscorridor
    python3 scripts/maint/sitemap_add.py  ../ccc https://campuscorridor.ca/ i18n js images photos Logos

`build_feeds.py` writes only when the feed actually changed, and parses its own
output before writing: a malformed feed is worse than a stale one. It compares
the whole feed with `lastBuildDate` normalised out, not just the list of item
links. Until 2026-10-26 it compared links only, so a page could have its title,
description, `pubDate` or `og:image` corrected and the feed would keep serving
the old text indefinitely — found when a French page's `og:image` was fixed and
`feed-fr.xml` went on advertising the English wordmark. Two josephsoares.com
descriptions had drifted the same way.

`sitemap_gap.py` is read-only and reports both directions — live indexable pages
missing from `sitemap.xml`, and URLs submitted that carry `noindex` or canonical
to somewhere else.

`sitemap.xml` is hand-curated (tiers, `changefreq`, `priority`, comments), so it
is never regenerated. `sitemap_add.py` splices in only what `sitemap_gap.py`
reports as missing, beside the nearest listed sibling and inheriting that
block's `changefreq` and `priority`; it never reorders or removes an entry, and
it parses the result before writing. That turns the recurring brief gap from a
hand-edit into one command.

## Why this exists

The droplet publisher writes `/brief/YYYY-MM-DD.html` and stops. It never
touches `sitemap.xml` or `feed.xml`, so editions accumulate unlisted and the
feed falls behind — recorded 2026-09-16, 2026-09-28 and again 2026-10-05.
Calling `build_feeds.py` from the publisher on publish, and appending the
sitemap entry there, retires that whole class of defect. Until then the weekly
maintenance run is a mop.

## hreflang

Never write a `?lang=` alternate into a sitemap: query-string alternates are the
pre-SOP one-URL mechanism and are not canonical URLs. Before writing any
`xhtml:link` annotation, verify it is self-referential and reciprocal — each
page must declare itself, and each target must point back. A non-reciprocal pair
is ignored by Google, so the translation gets no benefit at all.
