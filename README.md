# makefun-token-radar-bot

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vinzycius/makefun-token-radar-bot/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vinzycius/makefun-token-radar-bot/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for the [make.fun token-radar-01 bounty](https://make.fun/bounty/token-radar-01).

It reads a sealed snapshot of every protocol DefiLlama tracks, works out which ones still record no token and are not a wrapped or staked product of one that trades, ranks them by what their launch would be worth, and hands in a web dashboard that shows the board, a detail view for each protocol, and the steps to farm it.

## How it works

The value model (`lib/model.ts`) derives each protocol's implied value from the snapshot's own figures only — TVL, seven-day growth (on a log scale, so a big week is rewarded without dominating), and how long it has run with no token (saturating maturity credit, most of it in the first year). No protocol names are hardcoded. Protocols whose token already trades are separated into their own tab and never ranked.

The board covers the whole 40-protocol watchlist plus every pre-token protocol below the $50M floor — 226 rows in all — each with a concrete farm plan (8 steps naming capital, gas, and time).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22.18+ required. Standard library only, no network. Deterministic: two runs write identical bytes.

## Files

- `main.ts` — the program: reads the snapshot, writes `board.json`, `data.js`, the dashboard, screenshots, and `dossier.json`
- `lib/model.ts` — the value model and farm plans
- `vendor/makefun-board.ts` — the kit's dossier builder (byte-identical to the kit)
- `dashboard/` — the static page (board, detail view, filter; renders with no network)
- `screenshots/` — board, detail, and filtered views of the dashboard

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
