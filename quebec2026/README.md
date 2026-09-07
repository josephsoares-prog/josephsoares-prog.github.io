# Quebec 2026 Election Projection Tracker

Corridor Intelligence. Daily seat projection for the Quebec general election of 5 October 2026.

- `index-en.html` — English page
- `index-fr.html` — French page
- `data.json` — daily projection payload (the only file the daily run rewrites)

## Method
Riding-level uniform-regional-swing model built on official Elections Quebec returns for all 125 ridings of the 2022 general election (dgeq.org open data, gen2022-10-03 archive), mapped onto the 127 ridings of the 2026 electoral map (liste_circonscriptions2026.csv).

Back-test against 2022: mean absolute error 2.2 seats.

Sources are first-party throughout. See the methodology document for the full source registry, weighting rules, and declared falsification tests.
