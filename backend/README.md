# Rental Backend Template

This backend is ready for Bright Data manual testing, webhook delivery, and Firestore storage.

## Bright Data Setup

For manual testing, the website can call this backend to trigger a Bright Data snapshot.

```txt
POST /api/brightdata/trigger
POST /api/brightdata/process-ready
GET  /api/brightdata/snapshots/:snapshot_id/status
POST /api/brightdata/snapshots/:snapshot_id/import
```

The flow is:

```txt
trigger Bright Data
Bright Data returns snapshot_id
process-ready cron checks status later
download ready snapshots
import rows into raw_posts
decode pending posts with OpenAI
write decoded listings into listings
```

For automatic delivery later, Bright Data can send results to a webhook:

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
POST /api/brightdata/process-ready
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

## Cron Setup

Use two cron-job.org jobs so the trigger does not need to wait for Bright Data.

Smart scrape trigger runs at the top of each selected hour. It creates separate
small Bright Data snapshots: three fresher groups at 10 posts each, plus one
higher-overlap group at 5 posts on a four-hour rotation.

```txt
POST https://YOUR_BACKEND_DOMAIN/api/brightdata/trigger-smart
Content-Type: application/json
x-cron-secret: YOUR_CRON_SECRET
```

Keep `POST /api/brightdata/trigger` available for manual runs. For example:

```json
{"num_of_posts":10}
```

Process ready snapshots every 10-15 minutes:

```txt
POST https://YOUR_BACKEND_DOMAIN/api/brightdata/process-ready
Content-Type: application/json
x-cron-secret: YOUR_CRON_SECRET

{"job_limit":1,"decode_limit":5,"decode_batches":5}
```

The process-ready endpoint checks open Bright Data jobs, imports snapshots that are ready,
then decodes pending raw posts with OpenAI. `decode_limit` is per batch, and
`decode_batches` lets one cron run process multiple groups worth of imported posts.
Keep these values small for hosted cron jobs so the request returns before the
provider timeout. Run the job more frequently instead of processing a large
backlog in one request.

Remove older draft/non-listing rows from `listings`:

```bash
npm run cleanup:listings
```

Recompute duplicate groups for decoded listings:

```bash
npm run dedupe:listings
```
