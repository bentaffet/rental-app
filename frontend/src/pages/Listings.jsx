import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import FilterPanel from "../components/FilterPanel.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { filterListings } from "../features/listings/filterListings.js";
import { cacheListings, getCachedListings, getListings } from "../utils/apiClient.js";
import { readSavedListingIds, writeSavedListingIds } from "../utils/savedListings.js";

const listingsPageSize = 20;
const listingsViewStateKey = "roomup:listings-view-state";

const defaultFilters = {
  borough: "All",
  maxPrice: 2600,
  startDate: "",
  startMonthOnly: false,
  endDate: "",
  endMonthOnly: false,
  postedWithinDays: "",
  savedOnly: false,
  sortBy: "posted_desc",
};

export default function Listings() {
  const [filters, setFilters] = useState(defaultFilters);
  const [listings, setListings] = useState(() => getCachedListings());
  const [error, setError] = useState("");
  const [visibleListingCount, setVisibleListingCount] = useState(() => {
    try {
      const savedViewState = JSON.parse(
        window.sessionStorage.getItem(listingsViewStateKey) || "null"
      );
      return savedViewState?.visibleListingCount || listingsPageSize;
    } catch {
      return listingsPageSize;
    }
  });
  const [savedIds, setSavedIds] = useState(() => readSavedListingIds());

  useEffect(() => {
    getListings()
      .then((result) => {
        const nextListings = result.listings || [];
        cacheListings(nextListings);
        setListings(nextListings);
        setError("");
      })
      .catch((apiError) => setError(apiError.message));
  }, []);

  useEffect(() => {
    if (listings.length === 0) return;

    let savedViewState = null;
    try {
      savedViewState = JSON.parse(
        window.sessionStorage.getItem(listingsViewStateKey) || "null"
      );
    } catch {
      window.sessionStorage.removeItem(listingsViewStateKey);
    }

    if (!savedViewState?.restoreScroll) return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedViewState.scrollY || 0 });
      window.sessionStorage.setItem(
        listingsViewStateKey,
        JSON.stringify({
          ...savedViewState,
          restoreScroll: false,
        })
      );
    });
  }, [listings.length, visibleListingCount]);

  const filteredListings = useMemo(
    () => filterListings(listings, { ...filters, savedIds }),
    [filters, listings, savedIds]
  );
  const visibleListings = filteredListings.slice(0, visibleListingCount);
  const hasMoreListings = visibleListingCount < filteredListings.length;

  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    setVisibleListingCount(listingsPageSize);
    window.sessionStorage.removeItem(listingsViewStateKey);
  };

  const saveListingsViewState = () => {
    window.sessionStorage.setItem(
      listingsViewStateKey,
      JSON.stringify({
        restoreScroll: true,
        scrollY: window.scrollY,
        visibleListingCount,
      })
    );
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
    <div className="page-shell py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Listings</h1>
      </div>

      <FilterPanel filters={filters} onChange={updateFilters} />

      {error && (
        <div className="alert alert-warning mt-4 rounded">
          <span>API error: {error}</span>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saved={savedIds.has(listing.id)}
            onOpenListing={saveListingsViewState}
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
        <div className="mt-8 rounded border border-base-300 bg-base-100 p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">No listings</h2>
        </div>
      )}
    </div>
  );
}
