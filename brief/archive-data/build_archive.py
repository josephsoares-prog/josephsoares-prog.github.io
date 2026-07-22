#!/usr/bin/env python3
"""Rebuild the permanent Corridor Brief archive from every edition on disk.
Outputs editions.json, stories.json, stories.csv into brief/archive-data/.
Never prunes: captures full history regardless of what the live listing shows."""
import glob, json, csv, re, os
from bs4 import BeautifulSoup

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT=os.path.join(ROOT,'brief','archive-data')
editions=[]; stories=[]
for path in sorted(glob.glob(os.path.join(ROOT,'brief','20[0-9][0-9]-*.html'))):
    date=os.path.basename(path)[:-5]
    soup=BeautifulSoup(open(path,encoding='utf-8').read(),'html.parser')
    crumb=soup.select_one('.crumb span')
    long_en=crumb.get('data-en') if crumb else date
    long_fr=crumb.get('data-fr') if crumb else date
    items=soup.select('article.cb-item'); lead_en=lead_fr=''
    for art in items:
        rank=int(art.select_one('.cb-rank').get_text(strip=True))
        tag=art.select_one('.cb-tag'); hl=art.select_one('.cb-headline a')
        src=art.select_one('.cb-source'); bluf=art.select_one('.cb-bluf')
        st=src.get_text(' ',strip=True) if src else ''
        m=re.match(r'(.+?)\s*·\s*([^\s]+)',st)
        row={'date':date,'long_en':long_en,'rank':rank,
             'tag_en':tag.get('data-en') if tag else '','tag_fr':tag.get('data-fr') if tag else '',
             'headline_en':hl.get('data-en') if hl else '','headline_fr':hl.get('data-fr') if hl else '',
             'outlet':m.group(1).strip() if m else '','domain':m.group(2).strip() if m else '',
             'url':hl.get('href') if hl else '','bluf_en':bluf.get('data-en') if bluf else '',
             'bluf_fr':bluf.get('data-fr') if bluf else ''}
        stories.append(row)
        if rank==1: lead_en,lead_fr=row['headline_en'],row['headline_fr']
    editions.append({'date':date,'long_en':long_en,'long_fr':long_fr,'count':len(items),
                     'lead_en':lead_en,'lead_fr':lead_fr,'url':f'/brief/{date}.html'})
editions.sort(key=lambda e:e['date'],reverse=True)
stories.sort(key=lambda s:(s['date'],s['rank']))
json.dump(editions,open(os.path.join(OUT,'editions.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(stories,open(os.path.join(OUT,'stories.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
cols=['date','long_en','rank','tag_en','headline_en','outlet','domain','url','bluf_en','tag_fr','headline_fr','bluf_fr']
with open(os.path.join(OUT,'stories.csv'),'w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=cols); w.writeheader()
    for s in stories: w.writerow({k:s.get(k,'') for k in cols})
print(f'archive rebuilt: {len(editions)} editions, {len(stories)} stories')
