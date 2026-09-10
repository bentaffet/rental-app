const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getScrapedMetadata, applyScrapedMetadata, parsePrice } = require('../src/services/scrapedListingMetadata');
const { buildDecodeInput, normalizeListing, hasDecodeInput } = require('../src/services/listingDecodeService');
const { repairPatch } = require('../src/scripts/repairScrapedListingMetadata');
const raw = {
  id: '787001561415032_28729249510096862',
  content: 'This is 3 bedroom and 1.5 bathroom unit. All utilities are included on the price.',
  raw_payload: { price: 3600, location: 'Ozone Park, NY', post_external_title: '3 beds · 1.5 bath · House' },
};

test('decoder receives marketplace fields and fills omissions for the reported post', () => {
  const input = buildDecodeInput(raw);
  assert.ok(input[1].content.includes('"price": 3600'));
  assert.ok(input[1].content.includes('Ozone Park, NY'));
  assert.ok(input[1].content.includes('3 beds · 1.5 bath · House'));
  const listing = normalizeListing(raw, { is_listing: true, price: null, neighborhood: null, borough: null, city: null, state: null });
  assert.equal(listing.price, 3600);
  assert.equal(listing.neighborhood, 'Ozone Park');
  assert.equal(listing.borough, 'Queens');
  assert.equal(listing.city, 'New York');
  assert.equal(listing.state, 'NY');
  const patch = repairPatch(raw, { ...listing, price: null, neighborhood: null, borough: null, city: null, state: null });
  assert.equal(patch.price, 3600);
  assert.ok(!patch.dedupe_key.includes('unknown price'));
  assert.deepEqual(repairPatch(raw, listing), {});
});

test('preserves explicit decoded values and does not guess unknown location geography', () => {
  const listing = { price: 3200, neighborhood: 'Bushwick', borough: 'Brooklyn', city: 'New York', state: 'NY' };
  assert.deepEqual(applyScrapedMetadata(raw, listing), listing);
  const fallback = applyScrapedMetadata({ raw_payload: { location: 'Somewhere, NJ' } }, {});
  assert.equal(fallback.neighborhood, 'Somewhere, NJ');
  assert.equal(fallback.borough, undefined);
  assert.equal(fallback.city, undefined);
});

test('accepts only unambiguous positive amounts and allows metadata-only decode inputs', () => {
  for (const value of [null, '', false, 0, -5, Infinity, '3,60', '$100 per week', '$500 deposit', '2500-3600', 'Call for price']) {
    assert.equal(parsePrice(value), null);
  }
  assert.equal(parsePrice('$3,600.00'), 3600);
  assert.equal(hasDecodeInput({ raw_payload: raw.raw_payload }), true);
  assert.equal(hasDecodeInput({}), false);
  assert.deepEqual(getScrapedMetadata({}), { price: null, location: null, property_title: null });
});
