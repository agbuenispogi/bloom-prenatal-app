# Bloom ↔ Baby Snowflake

Baby Snowflake (https://baby-snowflake.vercel.app) is the family's **public** pregnancy journal. Bloom is
**private** health data. The connection is deliberately small.

## 1. Site → Bloom: latest update + due date

The site publishes a static file at **`/bloom-feed.json`**:

```json
{
  "dueDate": "2027-04-02",
  "latest": {
    "date": "2026-10-11",
    "week": 15,
    "title": "Low-risk screening results",
    "summary": "Optional, up to 280 characters.",
    "url": "https://baby-snowflake.vercel.app/#latest"
  }
}
```

- Bloom fetches it server-side, cached 1 hour (`src/lib/snowflake/feed.ts`), and shows
  "Baby Snowflake · Week 15: …" under the date on Today. Links only go back to the site.
- If Bloom has no due date set, it uses `dueDate`, so the week matches on both.
- If the file is missing or malformed, Bloom just shows nothing.
- Update `latest` whenever a new post goes up.

## 2. Bloom → Site: a gentle streak (opt-in)

`GET https://bloom-prenatal-app.vercel.app/api/public/streak` returns one of:

```json
{ "enabled": true, "streak": 5, "message": "Mama has cared for Snowflake 5 days in a row", "asOf": "2026-10-19" }
{ "enabled": false }
```

- It's off until **she** turns it on: Bloom → Settings → Pregnancy → "Show my caring streak on Baby Snowflake".
  Only the patient can change it.
- It never contains medicine names, doses, times or missed doses. The streak counts days with nothing missed.
- CORS allows only the Baby Snowflake origin. It's cached about 10 minutes.

Site snippet (render nothing unless enabled):

```html
<p id="bloom-streak" hidden></p>
<script>
  fetch("https://bloom-prenatal-app.vercel.app/api/public/streak")
    .then((r) => r.json())
    .then((d) => {
      if (!d.enabled) return;
      const el = document.getElementById("bloom-streak");
      el.textContent = d.message;
      el.hidden = false;
    })
    .catch(() => {});
</script>
```
