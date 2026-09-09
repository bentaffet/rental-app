import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Heart, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ListingImage from "../components/ListingImage.jsx";
import { getCachedListings, getListing, getListings } from "../utils/apiClient.js";
import { formatDate, formatPosted, formatPrice, pluralize } from "../utils/formatters.js";
import { getBestPlaceName } from "../utils/listingDisplay.js";
import { readSavedListingIds, writeSavedListingIds } from "../utils/savedListings.js";

function valueOrUnknown(value, fallback = "Unknown") {
  return value || fallback;
}

function DetailRow({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-sm font-medium text-base-content/55">{label}</dt>
      <dd className="mt-1 text-base text-ink">{value}</dd>
    </div>
  );
}

export default function ListingDetails() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(() =>
    getCachedListings().find((candidate) => candidate.id === listingId) || null
  );
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(() => readSavedListingIds());

  useEffect(() => {
    getListing(listingId)
      .then((result) => {
        setListing(result.listing);
        setError("");
      })
      .catch(() => {
        getListings()
          .then((result) => {
            const match = (result.listings || []).find(
              (candidate) => candidate.id === listingId
            );
            if (!match) {
              setError("Listing not found.");
              return;
            }
            setListing(match);
            setError("");
          })
          .catch((apiError) => setError(apiError.message));
      });
  }, [listingId]);

  function toggleSaved() {
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
  }

  if (error) {
    return (
      <div className="page-shell py-6">
        <Link to="/listings" className="btn btn-ghost btn-sm">
          <ArrowLeft size={17} />
          Listings
        </Link>
        <div className="alert alert-warning mt-4 rounded">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="page-shell py-6">
        <div className="skeleton h-96 w-full rounded" />
      </div>
    );
  }

  const originalUrl = listing.originalUrl || listing.source_url || "#";
  const price = listing.price ? `${formatPrice(listing.price)} /mo` : "No price";
  const bedrooms = listing.bedrooms ?? null;
  const bedLabel =
    bedrooms === 0
      ? "Studio"
      : bedrooms
        ? `${bedrooms} ${pluralize(bedrooms, "bed")}`
        : "Beds unknown";
  const availableFrom = listing.availableFrom || listing.available_from;
  const availableUntil = listing.availableUntil || listing.available_until;
  const leaseTerm = listing.leaseTerm || listing.lease_term;
  const postedAt = listing.postedAt || listing.date_posted || listing.decoded_at;
  const location = getBestPlaceName(listing);
  const amenities = listing.amenities || [];
  const transit = listing.transit || [];
  const saved = savedIds.has(listing.id);

  return (
    <div className="page-shell py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/listings" className="btn btn-ghost btn-sm">
          <ArrowLeft size={17} />
          Listings
        </Link>
        <div className="flex gap-2">
          {originalUrl && originalUrl !== "#" && (
            <button
              type="button"
              className="btn btn-outline btn-sm border-base-300 bg-base-100/75 text-ink shadow-sm backdrop-blur hover:bg-base-100"
              onClick={() => window.open(originalUrl, "_blank", "noreferrer")}
            >
              <ExternalLink size={17} />
              Facebook
            </button>
          )}
          <button
            type="button"
            className={`btn btn-outline btn-sm border-base-300 bg-base-100/75 shadow-sm backdrop-blur hover:bg-base-100 ${
              saved ? "text-secondary" : "text-ink"
            }`}
            onClick={toggleSaved}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />
            Save
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded border border-base-300 bg-base-100 shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_.9fr]">
          <div className="aspect-[4/3] bg-base-200 lg:aspect-auto">
            <ListingImage listing={listing} className="h-full w-full" />
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {listing.listingType || listing.listing_type ? (
                <span className="badge badge-primary">
                  {listing.listingType || listing.listing_type}
                </span>
              ) : null}
              <span className="badge">{bedLabel}</span>
              <span className="badge">
                {valueOrUnknown(listing.roomType || listing.room_type)}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-ink">
              {listing.title}
            </h1>

            <p className="mt-3 text-3xl font-bold text-ink">{price}</p>

            <div className="mt-5 grid gap-3 text-base">
              <p className="flex items-center gap-2 text-base-content/80">
                <MapPin size={19} className="text-primary" />
                {location}
              </p>
              <p className="flex items-center gap-2 text-base-content/80">
                <CalendarDays size={19} className="text-primary" />
                {availableFrom ? formatDate(availableFrom) : "Start unknown"}
                {availableUntil
                  ? ` to ${formatDate(availableUntil)}`
                  : leaseTerm
                    ? ` - ${leaseTerm}`
                    : ""}
              </p>
            </div>

            {listing.summary && (
              <p className="mt-6 text-base leading-7 text-base-content/75">
                {listing.summary}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-8 border-t border-base-300 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr]">
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailRow label="Posted" value={postedAt ? formatPosted(postedAt) : null} />
            <DetailRow label="Source" value={listing.source || listing.group_name} />
            <DetailRow label="Group" value={listing.groupName || listing.group_name} />
            <DetailRow label="Utilities" value={listing.utilities} />
            <DetailRow label="Bathrooms" value={listing.bathrooms} />
            <DetailRow label="Host" value={listing.host || listing.author_name} />
          </dl>

          <div className="grid gap-5">
            {amenities.length > 0 && (
              <section>
                <h2 className="font-semibold text-ink">Amenities</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <span key={amenity} className="badge badge-outline">
                      {amenity}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {transit.length > 0 && (
              <section>
                <h2 className="font-semibold text-ink">Transit</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {transit.map((item) => (
                    <span key={item} className="badge badge-outline">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {(listing.extractedFrom || listing.extracted_from) && (
              <section>
                <h2 className="font-semibold text-ink">Original text</h2>
                <p className="mt-3 whitespace-pre-line rounded bg-base-200 p-4 text-sm leading-6 text-base-content/75">
                  {listing.extractedFrom || listing.extracted_from}
                </p>
              </section>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
