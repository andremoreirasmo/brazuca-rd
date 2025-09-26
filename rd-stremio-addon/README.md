# Brazuca RD (Stremio Addon)

Proxies magnets from the Brazuca Torrents addon through Real‑Debrid into direct HTTP streams for Stremio.

## Setup

1. Node 18+ recommended. If using nvm:
   ```bash
   nvm use
   ```
2. Install deps:
   ```bash
   npm i
   ```
3. Create `.env`:
   ```bash
   PORT=7000
   LOG_LEVEL=info
   # Source addon is fixed to Brazuca Torrents (streams endpoint required)
   # SOURCE_BASE_URLS is ignored; source is hardcoded in code
   # Optional default RD token (can be overridden per request)
   REALDEBRID_TOKEN=your_rd_token
   ```

## Run

Dev:
```bash
npm run dev
```

Build + Start:
```bash
npm run build && npm start
```

## Usage in Stremio

Install addon URL (replace host/port):

`http://localhost:7000/manifest.json`

- Pass Real‑Debrid token per request or via env:
  - Query: `/stream/{type}/{id}.json?realdebridToken=RD_TOKEN`
  - Header: `x-rd-token: RD_TOKEN`
  - Or set `REALDEBRID_TOKEN` in `.env`

## Notas / Credits

- Este addon apenas faz proxy dos magnets para o Real‑Debrid. Todo o mérito pelas fontes de torrents é do criador do addon Brazuca Torrents ([link](https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/)).
- Fluxo: busca streams no Brazuca, escolhe magnet/infoHash, envia ao Real‑Debrid, seleciona o maior arquivo de vídeo, espera o download e retorna o link direto irrestrito.
- Para séries, o `id` segue o padrão do Stremio (`tt{imdb}:{season}:{episode}`).


