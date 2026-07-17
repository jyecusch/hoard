# Browser regression tests

Plain Playwright scripts (not a test-runner suite) covering every feature flow.
Each script signs up a fresh user against a running dev server and drives the UI,
printing `STEP …: OK` lines and a final `PASS`/`FAIL`.

```bash
# one-time: playwright is not a project dependency
npm i -D playwright && npx playwright install chromium

# with `npm run dev` running:
for f in e2e/*.mjs; do echo "== $f"; node "$f"; done

# against another instance:
HOARD_URL=https://hoard.example.com node e2e/01-core-flow.mjs
```

Notes:

- Scripts create real users/data — run them against dev or a throwaway instance,
  not your live inventory.
- Selectors are pragmatic (text + aria labels), so cosmetic copy changes can break
  them; treat failures as a prompt to look, not necessarily a regression.
- Camera scanning can't run headless; `04-codes.mjs` covers code entry/resolution
  and the label-claim flow, but scanning a physical label needs a phone.
