import { useEffect, useMemo, useState } from "react";
import FilterPanel from "../components/FilterPanel.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { filterListings } from "../features/listings/filterListings.js";
import { getListings } from "../utils/apiClient.js";

const defaultFilters = {
  borough: "All",
  maxPrice: 2600,
  startDate: "",
  startMonthOnly: false,
  endDate: "",
  endMonthOnly: false,
  postedWithinDays: "",
  sortBy: "posted_desc",
};

export default function Listings() {
  const [filters, setFilters] = useState(defaultFilters);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(() => new Set(["fb-28419843784318303"]));

  useEffect(() => {
    getListings()
      .then((result) => {
        setListings(result.listings || []);
        setError("");
      })
      .catch((apiError) => setError(apiError.message));
  }, []);

  const filteredListings = useMemo(
    () => filterListings(listings, filters),
    [filters, listings]
  );

  const toggleSaved = (listingId) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
  };

  return (
    <div className="page-shell py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Listings</h1>
        <span className="badge badge-lg">{filteredListings.length}</span>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} />

      {error && (
        <div className="alert alert-warning mt-4 rounded">
          <span>API error: {error}</span>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saved={savedIds.has(listing.id)}
            onToggleSaved={toggleSaved}
          />
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="mt-8 rounded border border-base-300 bg-base-100 p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">No listings</h2>
        </div>
      )}
    </div>
  );
}
