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

### Read usage and caching

Pending decoding uses an indexed `decoded_status in [pending, decode_failed]`
query with a server-side batch limit. A batch of 5 reads at most 5 matching
documents instead of the entire raw-post collection (an empty Firestore query
still has a [minimum read charge](https://firebase.google.com/docs/firestore/pricing)). Failed-decode resets also query only the
relevant statuses. These use the default single-field index, with no new
composite indexes or data migration required for records created by this app.
Legacy records without a `decoded_status` must be assigned `pending` before they
can be selected. Queue selection now follows document ID order, rather than
sorting the entire history by post date; concurrent-worker claiming is unchanged.

Collection and individual-document reads share a bounded in-memory cache and
coalesce simultaneous requests per backend process. Successful writes and deletes
update warm caches without another collection scan. Expiry is not extended by
writes, so updates from other backend instances, maintenance scripts, or the
Firebase console become visible within `FIRESTORE_READ_CACHE_SECONDS` (default
60). Read-before-write decisions during imports and job status updates bypass
the cache, as do decode queue queries. Repeat IDs within one scrape delivery
reuse the record already read or written by that import.

The browser reuses its listing results for five minutes, including empty results
and listing details, and shares concurrent listing requests. Visiting pages does
not extend that expiry. Decoding through the dashboard clears the browser cache.
Background imports can therefore take up to the browser's five-minute window
plus the server cache window to appear on a subsequent page load; an already
open page does not automatically poll. Filters and sorting still run locally.

The server cache retains at most 1,000 entries and 32 MiB of serialized data;
oversized results are returned but not retained. Cold starts, separate server
instances, and cache expiry still incur reads. Stats/timeline and listing cache
misses still scan their collections. This is not a shared persistent cache, and
it does not guarantee staying below a daily quota at every traffic/data volume.
Increasing the TTL trades cross-process freshness for fewer reads; set it to 0
to disable server caching. No live Firebase data is changed by installing this
update. Restart/redeploy the backend and rebuild/deploy the frontend to apply it.

Run `npm test` for read-count and cache correctness tests against a fake
Firestore adapter; these tests do not contact Firebase or OpenAI.

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
small Bright Data snapshots: two strongest groups at 10 posts each, one moderate
overlap group at 5 posts, plus one 5-post rotating group. The most repetitive
groups only run once every 8 hours.

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

### Structured marketplace metadata

The decoder receives `raw_payload.price`, `raw_payload.location`, and
`raw_payload.post_external_title` along with the written post and photo captions.
Missing decoded prices use a validated positive scraped amount; missing locations
retain the source label, with Ozone Park, NY mapped to Queens / New York / NY.
Existing decoded prices and places are preserved. Metadata-only posts can enter
classification, and changes to these marketplace fields participate in import
hashing and requeue completed posts for decoding.

Repair an existing decoded listing without OpenAI or a collection scan:

```bash
npm run repair:metadata -- --id 787001561415032_28729249510096862
npm run repair:metadata -- --id 787001561415032_28729249510096862 --apply
```

The first command previews changes. The second reads the raw post and listing
in a transaction and fills only missing price/location fields, updates the dedupe
key, and preserves all other fields. Repeating it after repair makes no writes.
It does not rebuild duplicate groups across other listings. Server/browser caches
can briefly retain the old values according to the cache windows described above.
