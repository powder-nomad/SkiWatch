Simple website to see all webcams of Korean ski resorts in one place.

## Scope

SkiWatch delivers **live webcams from KR/JP/CH/CA ski resorts** plus
**just-enough weather context** (current, multi-day forecast up to
10 days, past 48h history, air quality, rider indices) to support a
ski-day plan or decision.

SkiWatch is intentionally **anonymous and static**:

- No user accounts. No login.
- No push notifications.
- No per-user state on the server.
- No saved comparisons / saved dashboards.
- Favourites are stored in `localStorage` only (no cross-device sync).

Anything that needs to remember **who you are** belongs in Snowple,
which is a superset of SkiWatch's content with its own user-state
backend. SkiWatch's role in the wider product family is the webcam
aggregator — Snowple links out here for live cams.

Before adding a feature, ask: *does this need to remember anything
about a specific user?* If yes, it belongs in Snowple, not here.

## Resort URL references

[곤지암](https://www.konjiamresort.co.kr/ski/liveCam.dev)

[지산](https://www.jisanresort.co.kr/m/ski/slopes/webcam.asp)

[비발디](https://www.sonohotelsresorts.com/skiboard/status)

[엘리시안강촌](https://www.elysian.co.kr/about-gangchon/sky#guide-to-using-slopes)

[오크밸리](https://oakvalley.co.kr/ski/introduction/realtime#ski-hall)

[웰리힐리](https://www.wellihillipark.com/home/customer/webcam)

[휘닉스파크](https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie)

[용평](https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do)

[알펜시아](https://www.alpensia.com/guide/web-cam.do)

[하이원](https://www.high1.com/ski/slopeView.do?key=748&mode=p)

[오투](https://www.o2resort.com/SKI/liftInfo.jsp)

[무주](https://www.mdysresort.com/guide/webcam.asp)

[에덴밸리](https://www.edenvalley.co.kr/CS/cam_pop1.asp)

## Resort data

The app walks the [`powder-nomad/open-ski-data`](https://github.com/powder-nomad/open-ski-data) registry tree at runtime via `raw.githubusercontent.com`. Per-resort JSON files (`place.json`, `lifts.json`, `slopes.json`, `webcams.json`) are fetched in parallel after the registry index, so a single deploy stays in sync with upstream data without rebuilding the app.

The default base URL is:

```text
https://raw.githubusercontent.com/powder-nomad/open-ski-data/main
```

`VITE_RESORT_DATA_URL` overrides that base if you want to point at a fork or a pinned commit. The loader (`src/lib/openSkiData.ts`) handles the whole tree walk — `registry/index.json` → per-country → per-region → per-resort. The mapping into the SkiWatch `Resort` shape lives in the same file.

If the remote load fails, the app falls back to the dataset bundled at build time (`src/data/data.ts`).

## Weather, forecast, observations

Weather widgets call [Ridgecast](https://github.com/powder-nomad/ridgecast) (Korea-focused weather API) at runtime:

```text
GET /v1/places/{slug}/weather       (current snapshot)
GET /v1/places/{slug}/forecast      (24h / 5d / 10d horizon)
GET /v1/places/{slug}/observations  (past hourly history)
```

The base URL is `https://api.pk3d.dev/ridgecast/v1` by default, overridable via `VITE_WEATHER_API_BASE_URL`. The API key must be supplied via `VITE_WEATHER_API_KEY` at build time — see Ridgecast's admin docs for minting a key with the right origin allowlist (the deployed site needs `https://powder-nomad.github.io` allowed).

## Local development

```bash
npm install
echo "VITE_WEATHER_API_KEY=rgc_live_<your dev key>" > .env.local
npm run dev
```

`.env.local` is gitignored. The dev server runs at `http://localhost:5173/SkiWatch/`. For the weather endpoints to work from localhost, your Ridgecast key needs `http://localhost:5173` in its origin allowlist AND the server's `RIDGECAST_CORS_ORIGINS` env must include localhost too.

## Deploy

```bash
VITE_WEATHER_API_KEY=rgc_live_<prod key> npm run build
npm run deploy
```

`npm run deploy` uses `gh-pages` to push `dist/` to the `gh-pages` branch.
