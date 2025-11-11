# Boba Drops Automation v2

A Bun.js server that automates screenshot generation for Airtable records.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy `.env` file:
```bash
cp example.env .env
```

3. Fill in your environment variables in `.env`:
- `AIRTABLE_API_KEY`: Your Airtable API key
- `BROWSERLESSIO_TOKEN`: Your Browserless.io token
- `NGROK_AUTH_TOKEN`: Your ngrok auth token
- `AUTH_TOKEN`: Secret token for the /trigger endpoint

## Running

```bash
bun run server.js
```

## Endpoints

- `GET /` - Redirects to GitHub repository
- `GET /health` - Returns 200 OK if server is healthy
- `POST /trigger` - Processes a batch of 10 screenshots (requires `Authorization: Bearer <AUTH_TOKEN>` header)

## Usage

To trigger screenshot processing:

```bash
curl -X POST http://localhost:3000/trigger \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```
