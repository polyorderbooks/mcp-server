# PolyOrderbooks MCP Server

Historical Polymarket **order book depth** for Claude, Cursor and any other MCP
client — full L2 bid and ask ladders at 1-second resolution, with resolved
outcomes attached.

[![npm](https://img.shields.io/npm/v/@polyorderbooks/mcp-server)](https://www.npmjs.com/package/@polyorderbooks/mcp-server)

Polymarket's own API serves price history well. It does **not** archive order
book depth at any granularity — `/book` returns the current state and nothing
stores it. This server exposes depth that was captured live, which is the part
that cannot be recovered after the fact.

---

## Install

Nothing to install. Add it to your MCP client config and it runs via `npx`.

**Claude Desktop** — `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "polyorderbooks": {
      "command": "npx",
      "args": ["-y", "@polyorderbooks/mcp-server"],
      "env": { "POLYORDERBOOKS_API_KEY": "pob_..." }
    }
  }
}
```

**Cursor** — `.cursor/mcp.json`, same shape.

Get a free key at [polyorderbooks.com/signup](https://polyorderbooks.com/signup).
The free tier queries at 1-second resolution, the same as paid plans, over a
shorter history window.

---

## Tools

| Tool | What it does |
| --- | --- |
| `search_markets` | Find markets by keyword. Start here — slugs are not guessable. |
| `get_market` | One market in full, including outcome tokens and the winner. |
| `get_order_book_history` | L2 ladders over time. The thing Polymarket does not archive. |
| `get_price_history` | Price series per outcome token. |
| `get_market_metrics` | Spread, liquidity and volume as a time series. |
| `get_usage` | Plan, rate limits and quota. |

---

## Things worth knowing before you interpret the data

**Books go one-sided as markets resolve.** In the final minute of a 5-minute
market, **76% of snapshots have an empty bid or ask side** — nobody offers the
losing outcome. This is real market behaviour, not missing data, and it breaks
analysis that assumes two-sided books.

**Some snapshots are crossed.** Best bid at or above best ask, which is not
tradeable. They are flagged rather than removed so the rate stays measurable:
around 3% on 5-minute markets, median duration 2 seconds, 98% clearing within a
minute.

**Contract length changes everything.** A 4-hour contract is one-sided 0.5% of
the time; a 5-minute contract, 17%. Conclusions from one do not transfer to the
other.

**Responses get large quickly.** An hour at 1-second resolution is 3,600 buckets
per token, and a market has two. Keep windows narrow or resolution coarse, and
page with the returned `next_cursor`.

---

## Example prompts

> Find BTC 5-minute markets that resolved yesterday and show me how the order
> book depth changed in the final two minutes before settlement.

> For this market, what would a 100-share buy have cost against the actual ladder
> five seconds before close, versus the midpoint at that moment?

> Compare spread and liquidity across 5-minute, 15-minute and 4-hour BTC
> contracts over the last day.

The second one is the point of L2 data. A price series tells you where the market
was; only the ladder tells you what you could have traded at.

---

## Open data

897,192 snapshots across 805 resolved markets and three contract lengths are
published under CC BY 4.0 with a DOI, no signup:

[doi.org/10.5281/zenodo.22084114](https://doi.org/10.5281/zenodo.22084114)

Useful for checking the properties above yourself before relying on the API.

---

## Development

```bash
npm install
npm run build
POLYORDERBOOKS_API_KEY=pob_... npm run dev
```

The server speaks stdio. To exercise it without an MCP client, send JSON-RPC on
stdin — `initialize`, then `tools/list`, then `tools/call`.

---

## Links

- [polyorderbooks.com](https://polyorderbooks.com) — the API
- [docs.polyorderbooks.com](https://docs.polyorderbooks.com) — reference
- [Python client](https://pypi.org/project/polyorderbooks/) — `pip install polyorderbooks`
- [Free BTC sample](https://polyorderbooks.com/datasets/polymarket-btc-5min-orderbook-sample) — one market, no signup

## Licence

MIT. Not affiliated with, endorsed by, or connected to Polymarket.
