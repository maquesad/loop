# Loop

A personal daily dashboard: focus timer, workout routine, meals & recipes, and a work task list. Static HTML/CSS/JS, no build step, no backend — all data is stored in your browser's `localStorage`.

## Sections

- **Focus** — Pomodoro timer (configurable focus/break/long-break lengths), session count per day.
- **Workout** — Editable weekly routine (per weekday), daily checklist with progress bar.
- **Meals** — Daily meal plan (breakfast/lunch/dinner/snacks) + a recipe box (add/edit/delete, ingredients & steps).
- **Work** — Task list with priority tags.

Data is device-local. Use **Download JSON** / **Load JSON** at the bottom to back up or move your data between devices/browsers.

## Running locally

No build step needed — any static file server works, e.g.:

```bash
python3 -m http.server 8934
```

Then open http://localhost:8934.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** → set source to the `main` branch, root folder.
3. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## Planned

- Notion diary integration (needs a small serverless proxy to keep the Notion API token off the client).
- Persistent/synced storage beyond `localStorage` (so data isn't stuck on one device).
