#!/usr/bin/env python3
"""Input checks on the polls array in data.json.

verify.py checks the OUTPUT of daily.py (riding rows, seat sums, share sums).
Nothing checked the INPUT. This does. It is the automated stand-in for the
human read-through that used to gate every merge, so it is deliberately strict:
anything it cannot confirm mechanically is a failure, not a warning.

Run before daily.py. Exits non-zero and names the offending poll.

  python3 check_polls.py            # check the whole polls array
  python3 check_polls.py --since 2026-09-08   # only polls added after a date

Checks, and the mistake each one catches:
  house whitelist      a typo silently downgrades the poll to weight 0.8
  ASCII only           patch_many writes file bytes as Latin-1; any character
                       above U+00FF fails the commit (write "Leger", never the
                       accented spelling, inside data.json)
  share range/sum      a digit dropped or doubled (29 -> 2, 29 -> 92)
  movement tolerance   the same house does not move 10 points in a week; if it
                       appears to, the number was misread (decided vs all
                       respondents, a regional subsample, leaning included)
  duplicate house+date the same poll entered twice double-weights it
  date sanity          a fieldwork midpoint in the future, or before the cycle
  sample size          a subsample mistaken for the full sample
  src provenance       every poll must carry a source string; first-party URLs
                       are required by the task prompt and recorded in the PR
"""
import json, os, sys, datetime as dt

HOUSES = {"Leger", "Leger-regional", "Liaison", "Pallas",
          "Mainstreet", "Angus Reid", "Ipsos", "CROP"}
PARTIES = {"PQ", "CAQ", "PLQ", "PCQ", "QS"}
CYCLE_START = dt.date(2025, 1, 1)
ELECTION = dt.date(2026, 10, 5)
MAX_MOVE = 8.0          # points, vs the same house's previous poll
# Published shares are rounded and exclude "other", so the five-party sum runs
# a little either side of 100. Observed range in this cycle is 98-101; the
# bounds below catch a dropped or duplicated digit without flagging rounding.
SHARE_SUM = (94.0, 102.0)
N_RANGE = (300, 20000)

F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')


def ascii_only(v, path, fail):
    if isinstance(v, str):
        bad = [c for c in v if ord(c) > 127]
        if bad:
            fail.append(f"{path}: non-ASCII {bad!r} - patch_many writes "
                        f"Latin-1 and will reject this")
    elif isinstance(v, dict):
        for k, x in v.items():
            ascii_only(k, f"{path}.{k}", fail)
            ascii_only(x, f"{path}.{k}", fail)
    elif isinstance(v, list):
        for i, x in enumerate(v):
            ascii_only(x, f"{path}[{i}]", fail)


def main():
    since = None
    if '--since' in sys.argv:
        since = dt.date.fromisoformat(sys.argv[sys.argv.index('--since') + 1])

    d = json.load(open(F, encoding='utf-8'))
    fail = []
    polls = d.get('polls') or []
    if not polls:
        print('FAILED:\n  - polls array is empty')
        return 1

    # Top-level keys must survive a patch. A replacement that eats a key is the
    # failure mode the '}],"anchor_prov":' splice is most likely to produce.
    for k in ('P', 'R', 'v', 's', 'polls', 'anchor_prov', 'reg', 'ri', 'sim'):
        if k not in d:
            fail.append(f"top-level key {k!r} missing from data.json")

    seen = {}
    by_house = {}
    for i, p in enumerate(polls):
        tag = f"poll[{i}] {p.get('house','?')} {p.get('date','?')}"
        ascii_only(p, tag, fail)

        h = p.get('house')
        if h not in HOUSES:
            fail.append(f"{tag}: house {h!r} is not a weighted house "
                        f"(would silently get default weight 0.8)")

        try:
            date = dt.date.fromisoformat(p['date'])
        except Exception:
            fail.append(f"{tag}: unreadable date {p.get('date')!r}")
            continue
        if date > dt.date.today():
            fail.append(f"{tag}: fieldwork midpoint is in the future")
        if not (CYCLE_START <= date <= ELECTION):
            fail.append(f"{tag}: date outside the cycle")

        key = (h, p['date'])
        if key in seen:
            fail.append(f"{tag}: duplicate of poll[{seen[key]}] - "
                        f"double-weights the same fieldwork")
        seen[key] = i

        n = p.get('n')
        if not isinstance(n, int) or not (N_RANGE[0] <= n <= N_RANGE[1]):
            fail.append(f"{tag}: sample size {n!r} outside {N_RANGE}")

        s = p.get('s') or {}
        if set(s) != PARTIES:
            fail.append(f"{tag}: parties {sorted(s)} != {sorted(PARTIES)}")
        else:
            for party, val in s.items():
                if not isinstance(val, (int, float)) or not (0 <= val <= 60):
                    fail.append(f"{tag}: {party}={val!r} outside 0-60")
            tot = sum(s.values())
            if not (SHARE_SUM[0] <= tot <= SHARE_SUM[1]):
                fail.append(f"{tag}: five-party shares sum to {tot} "
                            f"(expected {SHARE_SUM[0]}-{SHARE_SUM[1]})")

        if not (p.get('src') or '').strip():
            fail.append(f"{tag}: no src - provenance is not optional")

        by_house.setdefault(h, []).append((date, i, s))

    # Movement tolerance, against the same house only. Comparing across houses
    # would flag real house effects; comparing a house with itself flags
    # transcription errors.
    for h, rows in by_house.items():
        rows.sort()
        for (d1, i1, s1), (d2, i2, s2) in zip(rows, rows[1:]):
            if since and d2 < since:
                continue
            if set(s1) != PARTIES or set(s2) != PARTIES:
                continue
            gap = (d2 - d1).days
            allowed = MAX_MOVE + (0.15 * max(gap - 14, 0))   # slack for long gaps
            for party in PARTIES:
                move = abs(s2[party] - s1[party])
                if move > allowed:
                    fail.append(
                        f"poll[{i2}] {h} {d2}: {party} moves {move:.0f} pts vs "
                        f"the same house on {d1} ({s1[party]} -> {s2[party]}, "
                        f"{gap}d apart, tolerance {allowed:.0f}). Usually a "
                        f"misread: decided voters only, full sample, no "
                        f"regional subsample. A real swing this size is the "
                        f"other case that must not merge unread.")

    if fail:
        print('FAILED:')
        for f in fail:
            print('  -', f)
        return 1

    newest = max(dt.date.fromisoformat(p['date']) for p in polls)
    print(f"poll checks passed | {len(polls)} polls | newest {newest} | "
          f"houses {sorted(by_house)}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
