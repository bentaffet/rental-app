import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ExternalLink,
  Heart,
  MapPin,
} from "lucide-react";
import ListingImage from "./ListingImage.jsx";
import { formatDate, formatPosted, formatPrice, pluralize } from "../utils/formatters.js";
import { getBestPlaceName } from "../utils/listingDisplay.js";

export default function ListingCard({ listing, saved, onOpenListing, onToggleSaved }) {
  const navigate = useNavigate();
  const price = listing.price ? formatPrice(listing.price) : "No price";
  const bedrooms = listing.bedrooms ?? null;
  const availableFrom = listing.availableFrom || listing.available_from;
  const availableUntil = listing.availableUntil || listing.available_until;
  const availabilityText = listing.availabilityText || listing.availability_text;
  const endAvailabilityText =
    listing.endAvailabilityText || listing.end_availability_text;
  const leaseTerm = listing.leaseTerm || listing.lease_term || "Term unknown";
  const listingType = listing.listingType || listing.listing_type || "Unknown";
  const roomType = listing.roomType || listing.room_type || "Unknown";
  const originalUrl = listing.originalUrl || listing.source_url || "#";
  const postedAt = listing.postedAt || listing.date_posted || listing.decoded_at;
  const amenities = listing.amenities || [];
  const location = getBestPlaceName(listing);
  const bedLabel =
    bedrooms === 0
      ? "Studio"
      : bedrooms
        ? `${bedrooms} ${pluralize(bedrooms, "bed")}`
        : "Beds unknown";

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded border border-base-300 bg-base-100 shadow-sm transition hover:bg-base-200/25 hover:shadow"
      onClick={() => {
        onOpenListing?.();
        navigate(`/listings/${encodeURIComponent(listing.id)}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenListing?.();
          navigate(`/listings/${encodeURIComponent(listing.id)}`);
        }
      }}
      role="button"
      tabIndex={0}
      title="Open listing details"
    >
      <div className="relative aspect-[4/3] bg-base-200">
        <ListingImage listing={listing} className="h-full w-full" />
        <div className="absolute right-3 top-3 flex gap-2">
          {originalUrl && originalUrl !== "#" && (
            <button
              type="button"
              className="btn btn-circle btn-sm border border-base-100/70 bg-base-100/70 text-ink shadow-md backdrop-blur transition hover:bg-base-100 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-base-content/30"
              onClick={(event) => {
                event.stopPropagation();
                window.open(originalUrl, "_blank", "noreferrer");
              }}
              aria-label="Open Facebook post"
            >
              <ExternalLink size={17} />
            </button>
          )}
          <button
            type="button"
            className={`btn btn-circle btn-sm border shadow-md backdrop-blur transition hover:bg-base-100 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-base-content/30 ${
              saved
                ? "border-base-100/80 bg-base-100/85 text-secondary"
                : "border-base-100/70 bg-base-100/70 text-ink"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSaved(listing.id);
            }}
            aria-label={saved ? "Remove saved listing" : "Save listing"}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">{listing.title}</h3>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-ink">{price}</span>
          <span className="text-sm text-base-content/60">/mo</span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-5 text-base-content/70">
          {listing.summary}
        </p>

        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-primary" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={17} className="text-primary" />
            <span>
              {availableFrom ? formatDate(availableFrom) : availabilityText || "Start unknown"}
              {availableUntil
                ? ` to ${formatDate(availableUntil)}`
                : endAvailabilityText
                  ? ` to ${endAvailabilityText}`
                  : ` - ${leaseTerm}`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {listingType !== "Unknown" && (
            <span className="badge badge-sm badge-primary">{listingType}</span>
          )}
          <span className="badge badge-sm">{bedLabel}</span>
          <span className="badge badge-sm">{roomType}</span>
          {amenities.slice(0, 2).map((amenity) => (
            <span key={amenity} className="badge badge-sm badge-outline">{amenity}</span>
          ))}
        </div>

        <div className="mt-3 border-t border-base-300 pt-3 text-xs text-base-content/55">
          {postedAt ? `Posted ${formatPosted(postedAt)}` : "Post date unknown"}
        </div>
      </div>
    </article>
  );
}
