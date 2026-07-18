# josephsoares.com — Technical SEO + AI-Discoverability Audit & Remediation
**Date:** 2026-07-18 · **Engineer:** Claude (Cowork) · **Status:** Fixes staged & committed locally — awaiting PAT to push & verify live.

---

## 1. Before / After scores (0–100)

| Dimension | Before | After (projected, verifies on deploy) | Ceiling blocker |
|---|---|---|---|
| Traditional SEO | ~70 | ~86 | GA4 fragmentation + long titles/metas (residual) |
| AI-Discoverability | ~62 | ~88 | No Wikidata/Wikipedia entity → no Knowledge Panel (human step) |

The site already had strong bones — unique titles, meta descriptions, canonicals on most pages, a working mobile menu, GSC file verification, and an AI-friendly robots.txt. The wins below close the gaps that were disproportionately hurting an authority brand whose strategy is being *cited by AI*.

---

## 2. Deployed log (finding → fix → commit)

All commits are staged locally in `/root/site_repo` on `main`. **Verification = "staged"** until the push lands; each is a live re-check I run the moment we deploy.

| # | Finding (severity) | Fix | Commit | Verified |
|---|---|---|---|---|
| 1 | **Homepage had no canonical, no OG/Twitter, no structured data** (P0) — worst gap on the most important page | Added canonical, full OG + Twitter + og:image, and `Person` + `Organization` + `WebSite` JSON-LD (`@graph`) with full `sameAs` | `f13d8fe` | staged |
| 2 | book.html missing canonical, incomplete OG, no Book schema (P1) | Completed OG/Twitter, canonical, `Book` JSON-LD (author linked to Person `@id`); no ISBN/price fabricated | `f13d8fe` | staged |
| 3 | Duplicate `alt` attributes; cover images had no dimensions (P2, CLS) | Single alt; added correct `width`/`height` (true 1600×2560 ratio) | `f13d8fe` | staged |
| 4 | robots.txt missing current AI crawlers (P1, AEO priority) | Added `ClaudeBot`, `OAI-SearchBot`, `Perplexity-User`, and an explicit `Bytespider` policy | `f5f6392` | staged |
| 5 | **sitemap.xml missing 12 real indexable pages** (P1) | Added book, services, chair, speaking, media, spark, sprint, appel + 4 FR/EN articles (all confirmed live 200) | `f5f6392` | staged |
| 6 | llms.txt stale + non-compliant ("former advisor to PM Harper") + omitted the book (P1) | Full rewrite: BLUF, canonical entity facts in Records-of-Decision language, Corridor Intelligence architecture, all key pages, sameAs | `f5f6392` | staged |
| 7 | chair / sprint / spark bare: no canonical, OG, or schema (P1) | Added canonical, OG/Twitter, `Service`/`WebPage` + `BreadcrumbList` JSON-LD (prices only where on-page) | `de40123` | staged |
| 8 | services.html missing og:image/Twitter; og:url mismatch (P2) | Added image + Twitter tags; fixed `og:url` `/services` → `/services.html` | `de40123` | staged |
| 9 | 3 article pages missing canonical (P2) | Added self-referencing canonicals | `0270f26` | staged |
| 10 | **Broken OG/Twitter images 404'd** on 4 article pages (P2) | Mirrored published EN images (orban-falls, hormuz-blockade) + fixed `.jpg`→`.png` | `0270f26` | staged |
| 11 | No custom 404 page — GitHub Pages default served (P2) | Added branded, `noindex` 404.html with links back to key pages | `8695500` | staged |
| 12 | Person entity under-linked for AI resolution (P1, AEO) | Appended verified **Forbes Councils** profile to Person `sameAs` | `8695500` | staged |

**16 files changed across 5 commits.** JSON-LD validated (parses clean), sitemap.xml validated (well-formed, 37 URLs), all referenced images confirmed to exist on disk.

---

## 3. AI-discoverability results

**Method note:** I do not have live API access to ChatGPT/Claude/Perplexity/Gemini from this session, so the "before" baseline is drawn from web search — a reasonable proxy for what answer engines can currently retrieve. The structural fixes (schema, sameAs, llms.txt, AI-bot allows) are the levers that move those answers; re-test manually in each assistant ~1–2 weeks post-deploy.

**Entity gap analysis (before):**
- Strong corroborating sources exist: Forbes Councils profile (Managing Partner, IBPROM Corp.), LinkedIn, X, ZoomInfo ("Chief of Staff at the Senate of Canada"), and government records (Treasury Board / Senate). Good raw material for entity resolution.
- **But there is no Wikipedia or Wikidata entity** → no Google Knowledge Panel, and AI assistants have no canonical node to anchor to. This is the single biggest remaining AI-discoverability ceiling and requires an off-site human step (below).
- The homepage — the page AI crawlers hit first — previously carried **zero** `Person`/`sameAs` schema. That's now fixed, which is the highest-leverage on-site change for "Who is Joseph Soares?" answers.

**AI-bot access (after):** robots.txt now explicitly welcomes GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Applebot(+Extended), Bytespider. `/llms.txt` now carries a complete BLUF, canonical facts, offerings, and the full key-page map.

---

## 4. Residual human actions (each pre-staged)

### A. GA4 is fragmented — needs your one decision *(highest priority; PREP-ONLY)*
Analytics is currently split and partly broken:
- **`G-HNRCLZN3PK`** on ~20 primary pages (advisory, intelligence, podcast, writing, call, corridor, all July allied-hub articles) — **looks canonical.**
- **`G-DQXQMXZXLV`** on 8 pages (services, media, speaking, appel + 4 FR/EN articles).
- **`g-investigation`** — a broken placeholder — on `brief/2026-07-14.html`.
- **7 pages have NO analytics at all**, including the **homepage**, book, spark, sprint, chair.

→ **Confirm which ID is canonical (I recommend `G-HNRCLZN3PK`).** On your word I will: (1) add it to the 7 un-tagged pages, (2) replace the `g-investigation` placeholder, and (3) optionally unify the 8 `G-DQXQMXZXLV` pages onto the canonical property. I did **not** auto-change this — picking wrong would split your data.

### B. Google Search Console — resubmit sitemap
GSC file verification is live (`google59756…html` returns 200). After deploy, resubmit `https://josephsoares.com/sitemap.xml` in GSC (it now has 12 more pages). Bing: an IndexNow-style key file (`/a1b2c3…txt`) is live but looks like a placeholder — worth confirming it's a real registered key.

### C. Wikidata / Wikipedia entity *(the Knowledge-Panel unlock)*
Create a Wikidata item for Joseph Soares (occupation, employer, notable roles, `sameAs` to the site + Forbes + LinkedIn). This is the missing anchor for a Knowledge Panel and stronger AI entity resolution. I can draft the full Wikidata statement set + a neutral-tone Wikipedia-style bio on request.

### D. Book ISBN & final publish metadata
`Book` schema is deployed without an ISBN (none exists yet — no fabrication). Send the ISBN and I'll add `isbn`/`workExample` when available.

### E. Broken "Canada Strong Fund" links on intelligence.html *(your editorial call)*
The April 30 commentary card links to `/canada-strong-fund-april-2026.html` and `/fonds-canada-strong-avril-2026.html` — both 404 (the full articles were never published). The card's inline text is fine. Either: **(1)** publish the two full articles (they're clearly intended), or **(2)** I strip the "Read full report" links + the share buttons that point to the dead URLs. Tell me which.

---

## 5. Proposed (not silently changed)

- **Homepage title drift:** Google currently shows an older title ("…Government-Proven."); the repo says "…Trusted at the Top." Not a bug — just confirm which line you want as canonical and I'll align.
- **Long titles/metas:** ~10 article pages have titles >60 chars and meta descriptions >200 (they'll truncate in SERPs). These are copy, not mechanics — I can trim on approval without changing meaning.
- **Pricing consistency:** advisory.html schema shows $5k/$10k; chair.html shows $1.5k/$5k. Different products, but worth a deliberate look.

---

## 6. Re-audit checklist (run post-deploy)
1. `curl` 200 on all changed pages + `/404.html` behavior on a bad URL.
2. Validate homepage/book/chair/sprint/spark JSON-LD in Google Rich Results Test.
3. Fetch `/robots.txt`, `/sitemap.xml`, `/llms.txt` live; confirm AI-bot block + 37 URLs.
4. GSC: resubmit sitemap, request indexing on the 12 newly-listed pages.
5. Confirm OG images render (LinkedIn Post Inspector / X Card Validator) on book, chair, the 4 article pages.
6. ~1–2 weeks later: re-ask "Who is Joseph Soares?" / "What is Corridor Intelligence?" / "Leadership Under Fire" in ChatGPT, Claude, Perplexity, Gemini; log answers + citations.
