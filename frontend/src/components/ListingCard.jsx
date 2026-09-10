import {
  CalendarDays,
  Heart,
  MapPin,
} from "lucide-react";
import ListingImage from "./ListingImage.jsx";
import { formatDate, formatPosted, formatPrice, pluralize } from "../utils/formatters.js";
import { getBestPlaceName } from "../utils/listingDisplay.js";

export default function ListingCard({ listing, saved, onToggleSaved }) {
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
  const hasOriginalUrl = originalUrl && originalUrl !== "#";
  const postedAt = listing.postedAt || listing.date_posted || listing.decoded_at;
  const amenities = listing.amenities || [];
  const location = getBestPlaceName(listing);
  const hasLocation = location && !location.toLowerCase().includes("unknown");
  const bedLabel =
    bedrooms === 0
      ? "Studio"
      : bedrooms
        ? `${bedrooms} ${pluralize(bedrooms, "bed")}`
        : null;
  const startText = availableFrom
    ? formatDate(availableFrom)
    : availabilityText && !availabilityText.toLowerCase().includes("unknown")
      ? availabilityText
      : "";
  const endText = availableUntil
    ? formatDate(availableUntil)
    : endAvailabilityText && !endAvailabilityText.toLowerCase().includes("unknown")
      ? endAvailabilityText
      : "";
  const hasLeaseTerm = !leaseTerm.toLowerCase().includes("unknown");
  const availabilityLabel = [
    startText && endText ? `${startText} to ${endText}` : startText || endText,
    !endText && hasLeaseTerm ? leaseTerm : "",
  ].filter(Boolean).join(" · ");
  const visibleAmenities = amenities
    .filter((amenity) => amenity && !amenity.toLowerCase().includes("unknown"))
    .slice(0, 2);

  const openOriginalPost = () => {
    if (hasOriginalUrl) {
      window.open(originalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded border border-base-300 bg-base-100 shadow-sm transition hover:bg-base-200/25 hover:shadow ${
        hasOriginalUrl ? "cursor-pointer" : ""
      }`}
      onClick={openOriginalPost}
      onKeyDown={(event) => {
        if (hasOriginalUrl && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openOriginalPost();
        }
      }}
      role={hasOriginalUrl ? "link" : undefined}
      tabIndex={hasOriginalUrl ? 0 : undefined}
      title={hasOriginalUrl ? "Open Facebook post" : undefined}
    >
      <div className="relative aspect-[16/10] bg-base-200">
        <ListingImage listing={listing} className="h-full w-full" />
        <div className="absolute right-3 top-3 flex gap-2">
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

      <div className="flex flex-1 flex-col p-3">
        <div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink">
            {listing.title}
          </h3>
        </div>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-ink">{price}</span>
          <span className="text-xs text-base-content/60">/mo</span>
        </div>

        <div className="mt-2 grid gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="shrink-0 text-primary" />
            <span>{hasLocation ? location : "No location listed"}</span>
          </div>
          {availabilityLabel && (
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="shrink-0 text-primary" />
              <span>{availabilityLabel}</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {listingType !== "Unknown" && (
            <span className="badge badge-sm badge-primary">{listingType}</span>
          )}
          {bedLabel && <span className="badge badge-sm">{bedLabel}</span>}
          {roomType !== "Unknown" && (
            <span className="badge badge-sm">{roomType}</span>
          )}
          {visibleAmenities.map((amenity) => (
            <span key={amenity} className="badge badge-sm badge-outline">{amenity}</span>
          ))}
        </div>

        {postedAt && (
          <div className="mt-auto border-t border-base-300 pt-2 text-xs text-base-content/55">
            Posted {formatPosted(postedAt)}
          </div>
        )}
      </div>
    </article>
  );
}
