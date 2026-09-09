const SAVED_LISTINGS_KEY = "roomup:saved-listings";

export function readSavedListingIds() {
  try {
    const savedIds = JSON.parse(
      window.localStorage.getItem(SAVED_LISTINGS_KEY) || "[]"
    );
    return new Set(Array.isArray(savedIds) ? savedIds : []);
  } catch {
    return new Set();
  }
}

export function writeSavedListingIds(savedIds) {
  window.localStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify([...savedIds]));
}
