#!/usr/bin/env python3
"""Corridor Quebec 2026 - daily recompute.

Reads data.json, re-ages the poll weights against today's date, re-runs the
riding-level projection and the simulation, writes data.json back.

Self-contained: every baseline it needs is already inside data.json.
To add a new poll, append to the "polls" array:
  {"house":"Leger","date":"2026-09-15","n":1000,
   "s":{"PQ":30,"CAQ":24,"PLQ":21,"PCQ":15,"QS":10},
   "src":"Leger/Le Journal/TVA, field 13-15 Sep 2026"}
Only house, date, n, s and src are required; age and weight are recomputed.

Override the date for testing with ASOF=YYYY-MM-DD.
"""
import json, math, random, datetime as dt, os
random.seed(20261005)

F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
d = json.load(open(F, encoding='utf-8'))
P = d["P"]
ELECTION = dt.date(2026, 10, 5)
TODAY = dt.date.fromisoformat(os.environ.get("ASOF") or dt.date.today().isoformat())

HW = {"Leger": 1.0, "Leger-regional": 1.0, "Liaison": .75, "Pallas": .85,
      "Mainstreet": .85, "Angus Reid": .9, "Ipsos": .9, "CROP": .9}
TAU = 10.0
POLL_ERR = 2.2
DRIFT = 0.11
PROV22 = {"PQ": 14.61, "CAQ": 40.98, "PLQ": 14.37, "PCQ": 12.91, "QS": 15.43}


def agg(asof):
    tot = 0.0
    acc = {p: 0.0 for p in P}
    used = []
    for pl in d["polls"]:
        age = (asof - dt.date.fromisoformat(pl["date"])).days
        if age < 0:
            continue
        w = math.sqrt(pl["n"]) * math.exp(-age / TAU) * HW.get(pl["house"], .8)
        tot += w
        for p in P:
            acc[p] += pl.get("s", {}).get(p, 0) * w
        used.append(dict(pl, age=age, weight=round(w, 1)))
    if tot == 0:
        return {p: d["v"][p] for p in P}, d["polls"]
    e = {p: acc[p] / tot for p in P}
    t = sum(e.values())
    return {p: e[p] / t * 100 for p in P}, sorted(used, key=lambda x: x["age"])


# Region baselines, rebuilt from the 2022 riding rows already in data.json.
RB = {}
for r in d["ri"]:
    if not r[6]:
        continue
    i = r[1]
    a = RB.setdefault(i, {"w": 0.0, **{p: 0.0 for p in P}})
    w = r[6][6]
    a["w"] += w
    for k, p in enumerate(P):
        a[p] += r[6][0][k] * w
BASE = {i: {p: a[p] / a["w"] for p in P} for i, a in RB.items()}

LEGER = {int(i): v for i, v in d["reg"].items() if v["src"] == "SOURCED"}
ANCHOR = {int(i): list(v["v"]) for i, v in d["reg"].items()}
# Provincial vote at the moment the Leger regional anchors were set. Sourced
# regions move by drift from this, so simulated draws propagate into them.
ANCHOR_PROV = d.get("anchor_prov") or dict(d["v"])


def project(sh):
    sw = {p: sh[p] - PROV22[p] for p in P}
    dr = {p: sh[p] - ANCHOR_PROV[p] for p in P}
    tg = {}
    for i in BASE:
        if i in LEGER:
            v = {p: max(.5, ANCHOR[i][k] + dr[p]) for k, p in enumerate(P)}
        else:
            v = {p: max(.5, BASE[i][p] + sw[p]) for p in P}
        t = sum(v.values())
        tg[i] = {p: v[p] / t * 100 for p in P}
    seats = {p: 0 for p in P}
    for r in d["ri"]:
        i = r[1]
        t = tg.get(i)
        if not t:
            continue
        if r[6]:
            # Proportional swing: scale the riding's 2022 share by the region's
            # target/base ratio. Bounded, and well behaved at extreme baselines
            # where additive swing produces impossible shares.
            v = {p: max(.2, r[6][0][k] * (t[p] / max(BASE[i][p], .5)))
                 for k, p in enumerate(P)}
        else:
            v = dict(t)
        s = sum(v.values())
        v = {p: v[p] / s * 100 for p in P}
        rk = sorted(P, key=lambda p: -v[p])
        r[2] = [round(v[p], 1) for p in P]
        r[3] = P.index(rk[0])
        r[4] = P.index(rk[1])
        r[5] = round(v[rk[0]] - v[rk[1]], 1)
        seats[rk[0]] += 1
    return seats, tg


def sim(sh, days, n=4000):
    sd = math.sqrt(POLL_ERR ** 2 + (DRIFT * days) ** 2)
    tal = {p: 0 for p in P}
    maj = {p: 0 for p in P}
    mino = 0
    dist = {p: [] for p in P}
    snap = [(list(r[2]), r[3], r[4], r[5]) for r in d["ri"]]
    for _ in range(n):
        # Polling error is correlated, not independent: if one party is
        # overstated the others are understated. Draw per-party errors, then
        # centre them so they sum to zero. Without this the errors compound
        # through renormalisation and the intervals blow out.
        e = [random.gauss(0, sd) for _ in P]
        m = sum(e) / len(e)
        dr = {p: max(1., sh[p] + e[i] - m) for i, p in enumerate(P)}
        t = sum(dr.values())
        dr = {p: dr[p] / t * 100 for p in P}
        s, _ = project(dr)
        top = max(P, key=lambda p: s[p])
        tal[top] += 1
        for p in P:
            dist[p].append(s[p])
        if s[top] >= 64:
            maj[top] += 1
        else:
            mino += 1
    for r, v in zip(d["ri"], snap):
        r[2], r[3], r[4], r[5] = list(v[0]), v[1], v[2], v[3]
    q = lambda l, x: sorted(l)[int(x * (len(l) - 1))]
    return {"most_seats": {p: round(tal[p] / n * 100, 1) for p in P},
            "majority": {p: round(maj[p] / n * 100, 1) for p in P},
            "p_minority": round(mino / n * 100, 1),
            "seat_ci": {p: [q(dist[p], .05), q(dist[p], .5), q(dist[p], .95)] for p in P},
            "sd_used": round(sd, 2), "runs": n}


sh, used = agg(TODAY)
if "anchor_prov" not in d:
    d["anchor_prov"] = dict(d["v"])
days = max((ELECTION - TODAY).days, 0)
seats, tg = project(sh)
d["asof"] = TODAY.isoformat()
d["dl"] = days
d["v"] = {p: round(sh[p], 1) for p in P}
d["s"] = seats
d["enep"] = round(1 / sum((sh[p] / 100) ** 2 for p in P), 2)
d["polls"] = used
d["sim"] = sim(sh, days)
seats, tg = project(sh)          # restore the central projection after the sim
d["s"] = seats
for i, v in d["reg"].items():
    t = tg.get(int(i))
    if t:
        v["v"] = [round(t[p], 1) for p in P]
        v["s"] = [sum(1 for r in d["ri"] if r[1] == int(i) and P[r[3]] == p) for p in P]
        v["l"] = P.index(max(P, key=lambda p: t[p]))

json.dump(d, open(F, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f"{TODAY} | {days}d to vote | {seats} | minority {d['sim']['p_minority']}%")
