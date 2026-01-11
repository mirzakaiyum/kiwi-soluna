# Kiwi Soluna ☀️🌙

A zero-dependency Deno-based Cloudflare Worker providing unified sun, moon & prayer time data.

---

## Quick Start 🔧

```bash
deno task dev      # Start local development server
deno task deploy   # Deploy to Cloudflare Workers
```

---

## API

### Endpoint

```
GET /api/{DD-MM-YYYY}?address={location}&method={id}
```

### Parameters

| Parameter | Required | Default | Description                         |
| --------- | -------- | ------- | ----------------------------------- |
| `address` | Yes      | -       | Location string (e.g., "London")     |
| `method`  | No       | 1       | Prayer calculation method ID (0-23) |

**Path:** `/api/{DD-MM-YYYY}` — Date in DD-MM-YYYY format (default: today)

### Example

```
GET /api/11-01-2026?address=London&method=1
```

### Moon Phases

- **New Moon** — Hijri days 1-4
- **First Quarter** — Hijri days 5-11
- **Full Moon** — Hijri days 12-18
- **Last Quarter** — Hijri days 19-25

---

## License

MIT
