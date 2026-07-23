# The Corridor Files — Data Spine

**The rule that makes this product:** every person is a structured record from first entry. The annual book is an export of these files, not a writing project.

## Record format
One markdown file per person: `files/data/records/{lastname-firstname}.md`. YAML front-matter carries the structured fields; the body carries sourced narrative notes only.

## Fields
`id` · `full_name` · `current_role` · `organization` · `party` · `jurisdiction` · `order_of_government` (federal/provincial/territorial/municipal) · `capital` (Ottawa/Quebec City/Toronto/…/Washington/London/Paris) · `prior_roles` [{role, org, start, end, source_url}] · `connections` [{person_id, relationship_type, source_url}] · `languages` · `first_recorded` · `last_verified` · `sources` [{claim, url, publication, date}] · `status` (active/departed/deceased) · `notes`

## Controlled relationship vocabulary
`worked_for` · `hired` · `campaign_colleague` · `mentor` · `rival` · `succeeded` · `client_of` · `same_firm` · `criticized` · `endorsed`
Add a term only by editing this README in the same commit — the vocabulary is what makes the network graph and the book index generatable.

## Editorial rules (non-negotiable)
1. **Published sources only.** No name enters a record without a citation to reporting, a registry, or an official record. Every claim in `sources` carries a URL.
2. **Roles and relationships, not character.** Character claims appear only as attributed quotes from published sources.
3. **Directors and above**, or anyone who has publicly placed themselves in a political fight. Junior staff are not public figures and do not get records.
4. **Non-partisan in construction.** Party is a data field, never a judgment.
5. **No dossiers on private individuals.** Not a public actor in politics → not in this product.
6. `last_verified` is updated every time a record is re-checked; stale records (>6 months) are flagged by the review pipeline before book export.
