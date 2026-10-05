# Feed and sitemap rails

Shared implementation for the two rails that keep the site discoverable.
Everything is read from the pages themselves — a page's own `<title>`, meta
description, `<html lang>`, canonical, robots meta, `og:image` and JSON-LD
`datePublished`. There is no second list to keep in step.

    python3 scripts/maint/build_feeds.py . --check     # report, write nothing
    python3 scripts/maint/build_feeds.py .             # regenerate feed.xml + feed-fr.xml
    python3 scripts/maint/sitemap_gap.py . https://josephsoares.com/ brief/archive-data

`build_feeds.py` writes only when the item set actually changed, and parses its
own output before writing: a malformed feed is worse than a stale one.
`sitemap_gap.py` is read-only and reports both directions — live indexable pages
missing from `sitemap.xml`, and URLs submitted that carry `noindex` or canonical
to somewhere else.

`sitemap.xml` is hand-curated (tiers, `changefreq`, `priority`, comments) and is
edited by hand from that report, not regenerated.

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
