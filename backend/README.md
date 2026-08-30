# Rental Backend Template

This backend is ready for Bright Data manual testing, webhook delivery, and Firestore storage.

## Bright Data Setup

For manual testing, the website can call this backend to trigger a Bright Data snapshot.

```txt
POST /api/brightdata/trigger
GET  /api/brightdata/snapshots/:snapshot_id/status
POST /api/brightdata/snapshots/:snapshot_id/import
```

The flow is:

```txt
trigger Bright Data
Bright Data returns snapshot_id
poll status until ready
download snapshot
import rows into raw_posts and listings
```

For automatic delivery later, use Bright Data's scheduler and set delivery to a webhook:

```txt
https://YOUR_BACKEND_DOMAIN/api/brightdata/webhook
```

Send a shared secret with the request. This backend accepts one of:

```txt
Authorization: Bearer YOUR_SECRET
x-brightdata-secret: YOUR_SECRET
x-webhook-secret: YOUR_SECRET
```

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev
```

For deployment, set `FRONTEND_ORIGIN` to the frontend domain that should be allowed to call the backend.

The template uses `data/local-datastore.json` until Firebase credentials are configured.

## Firebase Setup

Create a Firebase project, enable Firestore, then create a service account key from Firebase project settings.

Use one JSON env var:

```txt
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
USE_LOCAL_DATASTORE=false
```

Check the connection:

```bash
npm run check:firebase
```

Move local test data into Firestore:

```bash
npm run migrate:local-to-firestore
```

## Main Endpoints

```txt
GET  /api/health
GET  /api/brightdata/groups
GET  /api/brightdata/groups/stats
GET  /api/brightdata/jobs
POST /api/brightdata/trigger
GET  /api/brightdata/snapshots/:snapshot_id/status
POST /api/brightdata/snapshots/:snapshot_id/import
POST /api/brightdata/webhook
POST /api/openai/decode-pending
POST /api/openai/decode/:id
GET  /api/listings
GET  /api/listings/:id
```

## Firestore Collections

```txt
raw_posts/{group_id}_{post_id}
listings/{group_id}_{post_id}
brightdata_jobs/{snapshot_id}
```

Repeated Bright Data deliveries are deduped by content hash.

OpenAI decoding reads pending `raw_posts`, extracts structured listing fields, and writes back to `listings` using the same document ID.
Only OpenAI-decoded posts with `is_listing=true` are stored in `listings`.

## OpenAI Setup

```txt
OPENAI_API_KEY=your-openai-api-key
OPENAI_PROJECT_ID=proj_FZlQ37GTibGqIV08JPH15C3x
OPENAI_LISTING_DECODE_MODEL=gpt-4.1-mini
```

Use `POST /api/openai/decode-pending?limit=5` to decode a small batch of pending raw posts.

Remove older draft/non-listing rows from `listings`:

```bash
npm run cleanup:listings
```

Recompute duplicate groups for decoded listings:

```bash
npm run dedupe:listings
```
