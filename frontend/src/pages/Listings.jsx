import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronDown, Heart } from "lucide-react";
import FilterPanel from "../components/FilterPanel.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { filterListings } from "../features/listings/filterListings.js";
import { getCachedListings, getListings } from "../utils/apiClient.js";
import { readSavedListingIds, writeSavedListingIds } from "../utils/savedListings.js";

const listingsPageSize = 20;

const defaultFilters = {
  borough: "All",
  minPrice: 0,
  maxPrice: 6000,
  startMonth: "",
  endMonth: "",
  postedWithinDays: "",
  savedOnly: false,
  sortBy: "posted_desc",
};

export default function Listings() {
  const [filters, setFilters] = useState(defaultFilters);
  const [listings, setListings] = useState(() => getCachedListings());
  const [error, setError] = useState("");
  const [visibleListingCount, setVisibleListingCount] = useState(listingsPageSize);
  const [savedIds, setSavedIds] = useState(() => readSavedListingIds());
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    getListings()
      .then((result) => {
        const nextListings = result.listings || [];
        setListings(nextListings);
        setError("");
      })
      .catch((apiError) => setError(apiError.message));
  }, []);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > window.innerHeight * 0.75);
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);

  const filteredListings = useMemo(
    () => filterListings(listings, { ...filters, savedIds }),
    [filters, listings, savedIds]
  );
  const monthOptions = useMemo(() => {
    const months = new Set();

    listings.forEach((listing) => {
      [
        listing.availableFrom || listing.available_from,
        listing.availableUntil || listing.available_until,
      ].forEach((value) => {
        const month = typeof value === "string" ? value.slice(0, 7) : "";
        if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
      });
    });

    return [...months].sort().map((value) => ({
      value,
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}-01T00:00:00Z`)),
    }));
  }, [listings]);
  const visibleListings = filteredListings.slice(0, visibleListingCount);
  const hasMoreListings = visibleListingCount < filteredListings.length;

  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    setVisibleListingCount(listingsPageSize);
  };

  const toggleSaved = (listingId) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      writeSavedListingIds(next);
      return next;
    });
  };

  return (
    <div className="listings-shell py-3">
      <h1 className="sr-only">Listings</h1>

      {error && (
        <div className="alert alert-warning mb-4 rounded">
          <span>API error: {error}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div>
          <FilterPanel
            filters={filters}
            monthOptions={monthOptions}
            onChange={updateFilters}
          />
        </div>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-base-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="saved-toggle relative grid w-full grid-cols-2 rounded-full bg-base-200 p-1 sm:w-64"
              role="group"
              aria-label="Listing view"
            >
              <span
                className={`saved-toggle-indicator ${filters.savedOnly ? "translate-x-full" : "translate-x-0"}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className={`relative z-10 rounded-full px-3 py-2 text-sm font-medium transition ${
                  filters.savedOnly ? "text-base-content/60" : "text-ink"
                }`}
                onClick={() => updateFilters({ ...filters, savedOnly: false })}
                aria-pressed={!filters.savedOnly}
              >
                All listings
              </button>
              <button
                type="button"
                className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
                  filters.savedOnly ? "text-ink" : "text-base-content/60"
                }`}
                onClick={() => updateFilters({ ...filters, savedOnly: true })}
                aria-pressed={filters.savedOnly}
              >
                <Heart size={14} fill={filters.savedOnly ? "currentColor" : "none"} />
                Saved only
              </button>
            </div>

            <label className="flex items-center gap-2">
              <span className="flex shrink-0 items-center gap-1.5 text-sm text-base-content/60">
                <ArrowDownUp size={15} />
                Sort by
              </span>
              <select
                className="select select-bordered select-sm w-full sm:w-48"
                value={filters.sortBy}
                onChange={(event) => updateFilters({ ...filters, sortBy: event.target.value })}
              >
                <option value="none">Recommended</option>
                <option value="posted_desc">Newest posted</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
              </select>
            </label>
          </div>

          <p className="mt-4 text-sm text-base-content/60">
            {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"}
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                onToggleSaved={toggleSaved}
              />
            ))}
          </div>

          {hasMoreListings && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-base-content/60">
                Showing {visibleListings.length} of {filteredListings.length}
              </p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  setVisibleListingCount((current) => current + listingsPageSize)
                }
              >
                <ChevronDown size={18} />
                Load more
              </button>
            </div>
          )}

          {filteredListings.length === 0 && (
            <div className="mt-4 rounded-xl border border-base-300 bg-base-100 p-10 text-center">
              <h2 className="text-xl font-semibold text-ink">No listings found</h2>
              <p className="mt-2 text-sm text-base-content/60">
                Try widening your filters to see more options.
              </p>
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        className={`fixed bottom-6 right-6 z-30 rounded-full border border-base-300 bg-base-100/75 px-5 py-3 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition-all hover:bg-base-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          showBackToTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Back to top
      </button>
    </div>
  );
}
