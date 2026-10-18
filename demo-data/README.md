# Presentation data: 2023.json

Made-up company data for showing the app. Every name, phone number and amount is invented.

## Import it
1. Sign in as an **admin** (in local mode you are already one).
2. **Admin** → **Import & backup** → **Import a backup (JSON)** → choose `2023.json`.
3. Choose **Replace all data**, type `REPLACE`, press **Import**. (**Add to current data** also works; it keeps what is already there.)
4. At the top of the app, choose **Year 2023** in the date menu to see the full year of charts.

With cloud sync on, the import is uploaded and every signed-in device receives it.

## What is inside
- **2023 history:** about 12 months of sales, busy in April, May and September to December. India 8-day and 12-day packages sell most, then 5-day, then 15-day, plus Thailand and Nepal trips. All four booking statuses, five home towns, inbound and outbound tickets.
- **Live slice (dated 19 Oct 2026):** trips leaving this week, some missing a passport, visa or flight, visa and passport cases past their deadline, passports that expired or expire soon, and fresh enquiries. This makes Trips, the alert bell, the Overview alerts and the case boards show something.

The live slice is tied to the day the file was made. For a presentation on another day, make a fresh file for that day:

```bash
node demo-data/make-2023.mjs 2026-12-01
```

(Use the presentation day instead of `2026-12-01`.) Or, in local mode, use **Settings → Presentation demo**, which always builds around today.

## Checked automatically
`app/tests/demo2023.test.ts` checks that the file passes the importer, that every row is accepted by the real database tables and access rules and comes back unchanged, and that it has something for every screen.
