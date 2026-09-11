# sovereignty-vendors

Open, community-maintained ratings of common developer-stack vendors by their exposure to **non-EU legal jurisdiction** — the US CLOUD Act, FISA 702, and equivalent third-country statutes.

Used by the [Eurobase Sovereignty Check](https://eurobase.app/sovereignty-check) and freely available for anyone else who wants to reason about their stack's regulatory posture.

## Why this exists

Picking `eu-central-1` on Firebase or Supabase does not remove US legal reach. Jurisdiction follows the corporate parent, not the datacenter. Most developer teams — and the DPO signing their Article 30 record — have never had this explained clearly. This dataset is that explanation, one vendor at a time, with sources.

## What's in here

- `vendors/*.yaml` — one file per vendor. See [`schema/vendor.schema.json`](schema/vendor.schema.json) for the exact shape.
- `sources/*` — screenshots, PDFs, or archived pages backing each rating.

Every entry carries a `last_reviewed` date. Entries older than 180 days are flagged by CI.

## Rating model

Five dimensions per vendor:

| Dimension | Question |
|-----------|----------|
| **Entity control** | Is the contracting entity ultimately controlled by a US (or other third-country) parent? |
| **Data location** | Where does data actually rest, including backups and logs? |
| **Operational access** | Can non-EU staff access production data for support / SRE? |
| **Subprocessor chain** | Is there a US hyperscaler underneath? |
| **Transfer mechanism** | SCCs + TIA required, or no transfer at all? |

Each dimension scores 🔴 red / 🟠 amber / 🟢 green. Overall rating is the worst of the five — a green data-location on a US-controlled entity is still red.

## Contributing

**New vendor:** open a PR adding `vendors/<slug>.yaml`. CI validates against the JSON Schema.

**Rating dispute:** open an issue with the vendor slug in the title. Include the specific claim you disagree with and a source. We review disputes publicly.

**Correction:** open a PR. Change `last_reviewed` to today's date and cite the new source.

Please keep language conservative:
- ✅ "Legal exposure to the CLOUD Act"
- ❌ "This vendor is illegal / not GDPR compliant"

We're rating **jurisdictional exposure**, not compliance status.

## License

MIT — see [LICENSE](LICENSE). Use the data anywhere. Attribution appreciated, not required.

## Disclaimer

Not legal advice. Use these ratings as one input among many. If you have a specific regulatory question, talk to your DPO or counsel.
