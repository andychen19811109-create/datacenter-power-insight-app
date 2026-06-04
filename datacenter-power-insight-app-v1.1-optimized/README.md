# DataCenter PowerInsight

AI data center power electronics and infrastructure market intelligence prototype.

This repository is structured as a single deployable Vite app at the repository root. Vercel should use `./` as the root directory, `npm run build` as the build command, and `dist` as the output directory.

## Run Locally

Vite project:

```bash
npm install
npm run dev
```

Standalone local version:

```bash
python3 -m http.server 5177
```

Then open:

```text
http://127.0.0.1:5177/standalone.html
```

## Public Single-File Version

`public-compiled.html` is the most portable version. It includes the compiled React app in one HTML file and can be opened directly or served from any static host.

## Files

- `src/App.jsx`: main React application shell and tab composition
- `src/data/marketData.js`: source-backed market intelligence data model
- `src/utils/insightUtils.js`: filtering, scoring, and summarization helpers
- `src/App.css`: professional dark B2B UI styling
- `src/main.jsx`: Vite entry point
- `vite.config.js`: Vite config for local and hosted preview
- `standalone.html`: local standalone browser version
- `public-compiled.html`: portable single-file static version

## Data Notice

This is expert-curated prototype data. Formal commercial use should connect verified market databases, Firestore tables, or API intelligence sources.
