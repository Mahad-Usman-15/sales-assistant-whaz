# app/ Notes

- ⚠️ **Blank page / dead Generate button = corrupted `.next`, not a render bug.** Turbopack sometimes writes an empty React Client Manifest; the server still serves correct HTML (curl looks fine) but the browser throws a hydration error and the form becomes inert. Fix: `npm run dev:clean`. Diagnose by checking the **browser console**, not the server log. Full writeup in `README.md` → Troubleshooting.
- `app/global-error.tsx` exists partly as a workaround: Next 16 + Turbopack fails to resolve its *built-in* global-error module, so defining our own keeps that path off the table.
