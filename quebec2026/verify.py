#!/usr/bin/env python3
"""Sanity checks on data.json. Exits non-zero if the daily run produced
something that must not be published. Run after daily.py, before committing."""
import json, os, sys

F = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
d = json.load(open(F, encoding='utf-8'))
P = d['P']
fail = []

if len(d['ri']) != 127:
    fail.append(f"expected 127 ridings, got {len(d['ri'])}")
if sum(d['s'].values()) != 127:
    fail.append(f"seats sum to {sum(d['s'].values())}, not 127")

for p in P:
    rows = sum(1 for r in d['ri'] if P[r[3]] == p)
    if rows != d['s'][p]:
        fail.append(f"{p}: {rows} riding rows but seat total says {d['s'][p]}")

for r in d['ri']:
    tot = sum(r[2])
    if not (99.0 < tot < 101.0):
        fail.append(f"{r[0]}: projected shares sum to {tot:.1f}")
    if min(r[2]) < 0 or max(r[2]) > 100:
        fail.append(f"{r[0]}: share outside 0-100")

if not (0 <= d['dl'] <= 400):
    fail.append(f"days-to-vote out of range: {d['dl']}")
if not (0 <= d['sim']['p_minority'] <= 100):
    fail.append("minority probability out of range")
if not d.get('polls'):
    fail.append("no polls in the aggregate")

if fail:
    print('FAILED:')
    for f in fail:
        print('  -', f)
    sys.exit(1)

print(f"checks passed | {d['asof']} | {d['dl']}d | {d['s']} | minority {d['sim']['p_minority']}%")
