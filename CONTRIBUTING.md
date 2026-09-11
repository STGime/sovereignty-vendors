# Contributing

Thanks for helping keep this dataset honest.

## Add a new vendor

1. Create `vendors/<slug>.yaml`. The `slug` field must match the filename (minus `.yaml`).
2. Fill in every required field per [`schema/vendor.schema.json`](schema/vendor.schema.json).
3. `last_reviewed`: today's date, `YYYY-MM-DD`.
4. `sources`: at least one URL or path under `sources/`. **A rating without a source is not a rating.**
5. Run `npm install && npm run validate` locally. CI runs the same on every PR.
6. Open a PR. Explain the vendor briefly in the PR description and link the specific source lines that back each dimension's rating.

## Dispute a rating

Open an issue with the vendor slug in the title (e.g. `[vercel] operational_access is red, evidence says amber`).

Include:
- The specific dimension you disagree with.
- A citable source (URL, PDF page, DPA section).
- What you think the correct rating is.

We review disputes publicly. If the source justifies the change, we merge a correction PR and bump `last_reviewed`.

## Correction / refresh

Open a PR that updates the vendor's YAML and sets `last_reviewed` to today. Cite the new source in the PR description. CI will flag entries older than 180 days as warnings on `main`.

## Language & framing

We're rating **jurisdictional exposure**, not vendor compliance status.

- ✅ "Legal exposure under the CLOUD Act"
- ✅ "Subject to US surveillance statutes"
- ❌ "Not GDPR compliant"
- ❌ "Illegal to use in the EU"

The distinction matters. Every rating is disputed by someone. Careful language keeps the disputes about the facts.

## Overall rating rule

`ratings.overall` must equal the worst of the five dimensions. If any dimension is red, overall is red; if the worst is amber, overall is amber. The validator enforces this — you can't ship an amber overall on a vendor with a red dimension.

## Conflict of interest

Eurobase OÜ maintains this repo. Eurobase's own entry (`vendors/eurobase.yaml`) carries a `self_disclosure: true` flag so the checker's UI renders a visible COI banner. Don't set this flag on other vendors.

If you think Eurobase's own rating is too generous, open an issue. Grading ourselves green while denying others the same grade would destroy the credibility of the dataset the first time someone noticed.

## Non-goals

- We do not rate individual product SKUs (e.g. AWS European Sovereign Cloud vs standard AWS) — one entry per vendor. Nuances go in `notes`.
- We do not certify anything. This dataset is a research aid, not a compliance signal.
- We do not give legal advice.
