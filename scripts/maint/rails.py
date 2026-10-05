#!/usr/bin/env python3
"""Feed + sitemap rails builder for Joseph Soares' static sites.

Reads each page's own <title>, meta description, <html lang>, canonical,
robots meta and JSON-LD datePublished. Builds RSS 2.0 feeds and reports
sitemap gaps. Deterministic: same inputs -> same bytes.
"""
import os, re, sys, json, html, argparse, datetime, xml.etree.ElementTree as ET

RE_LANG  = re.compile(r'<html[^>]*\blang\s*=\s*["\']([A-Za-z-]+)', re.I)
RE_TITLE = re.compile(r'<title[^>]*>(.*?)</title>', re.I | re.S)
RE_DESC  = re.compile(r'<meta[^>]+name\s*=\s*["\']description["\'][^>]*>', re.I)
RE_OGIMG = re.compile(r'<meta[^>]+property\s*=\s*["\']og:image["\'][^>]*>', re.I)
RE_CANON = re.compile(r'<link[^>]+rel\s*=\s*["\']canonical["\'][^>]*>', re.I)
RE_ROBOT = re.compile(r'<meta[^>]+name\s*=\s*["\']robots["\'][^>]*>', re.I)
RE_CONTENT = re.compile(r'\b(?:content|href)\s*=\s*(["\'])(.*?)\1', re.I | re.S)
RE_JSONLD = re.compile(r'<script[^>]+type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.I | re.S)
RE_DATEPUB = re.compile(r'"datePublished"\s*:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})')
RE_ALT = re.compile(r'<link[^>]+rel\s*=\s*["\']alternate["\'][^>]*>', re.I)
RE_HREFLANG = re.compile(r'\bhreflang\s*=\s*["\']([A-Za-z-]+)["\']', re.I)

BRANDING = [
    r'\s*\|\s*Joseph Soares\s*$',
    r'\s*[—–-]\s*Joseph Soares\s*$',
    r'\s*\|\s*Capital Corridor Campus\s*$',
    r'\s*[—–-]\s*Capital Corridor Campus\s*$',
    r'\s*\|\s*Corridor Intelligence\s*$',
]
DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
MONS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']


def attr(tag):
    m = RE_CONTENT.search(tag or '')
    return html.unescape(m.group(2).strip()) if m else ''


def strip_brand(t):
    for p in BRANDING:
        t = re.sub(p, '', t)
    return t.strip()


def rfc822(d):
    dt = datetime.date.fromisoformat(d)
    return f"{DAYS[dt.weekday()]}, {dt.day:02d} {MONS[dt.month-1]} {dt.year} 00:00:00 +0000"


def rfc822_now():
    n = datetime.datetime.now(datetime.timezone.utc)
    return (f"{DAYS[n.weekday()]}, {n.day:02d} {MONS[n.month-1]} {n.year} "
            f"{n.hour:02d}:{n.minute:02d}:{n.second:02d} +0000")


def scan(root, skip_dirs):
    pages = {}
    for dirpath, dirnames, files in os.walk(root):
        dirnames[:] = [d for d in dirnames
                       if d != '.git' and not d.startswith('_')
                       and os.path.relpath(os.path.join(dirpath, d), root) not in skip_dirs]
        for f in files:
            if not f.endswith('.html'):
                continue
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            try:
                src = open(full, encoding='utf-8', errors='replace').read()
            except OSError:
                continue
            head = src[:src.find('</head>')+7] if '</head>' in src else src
            jl = ''.join(RE_JSONLD.findall(src))
            dm = RE_DATEPUB.search(jl) or RE_DATEPUB.search(src)
            alts = {}
            for t in RE_ALT.findall(head):
                hl = RE_HREFLANG.search(t)
                if hl:
                    alts[hl.group(1).lower()] = attr(t)
            tm = RE_TITLE.search(head)
            pages[rel] = {
                'path': rel,
                'lang': (RE_LANG.search(head).group(1).lower() if RE_LANG.search(head) else ''),
                'title_raw': html.unescape(re.sub(r'\s+', ' ', tm.group(1)).strip()) if tm else '',
                'desc': attr(RE_DESC.search(head).group(0)) if RE_DESC.search(head) else '',
                'ogimage': attr(RE_OGIMG.search(head).group(0)) if RE_OGIMG.search(head) else '',
                'canonical': attr(RE_CANON.search(head).group(0)) if RE_CANON.search(head) else '',
                'robots': (attr(RE_ROBOT.search(head).group(0)).lower() if RE_ROBOT.search(head) else ''),
                'date': dm.group(1) if dm else '',
                'alts': alts,
                'mtime': os.path.getmtime(full),
            }
            pages[rel]['title'] = strip_brand(pages[rel]['title_raw'])
    return pages


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def build_feed(items, chan, limit):
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
           '  <channel>',
           f'    <title>{esc(chan["title"])}</title>',
           f'    <link>{chan["link"]}</link>',
           f'    <atom:link href="{chan["self"]}" rel="self" type="application/rss+xml"/>',
           f'    <description>{esc(chan["description"])}</description>',
           f'    <language>{chan["language"]}</language>',
           f'    <copyright>{esc(chan["copyright"])}</copyright>',
           f'    <managingEditor>{esc(chan["editor"])}</managingEditor>',
           f'    <webMaster>{esc(chan["editor"])}</webMaster>',
           f'    <lastBuildDate>{chan["lastBuildDate"]}</lastBuildDate>',
           f'    <generator>{esc(chan["generator"])}</generator>']
    for it in items[:limit]:
        out += ['    <item>',
                f'      <title>{esc(it["title"])}</title>',
                f'      <link>{it["url"]}</link>',
                f'      <guid isPermaLink="true">{it["url"]}</guid>',
                f'      <pubDate>{rfc822(it["date"])}</pubDate>',
                f'      <description>{esc(it["desc"])}</description>']
        if it.get('ogimage'):
            out.append(f'      <enclosure url="{esc(it["ogimage"])}" type="image/jpeg" length="0"/>')
        out.append('    </item>')
    out += ['  </channel>', '</rss>', '']
    return '\n'.join(out)


def item_set(xmlpath):
    t = ET.parse(xmlpath).getroot()
    return [i.findtext('link') for i in t.iter('item')]
