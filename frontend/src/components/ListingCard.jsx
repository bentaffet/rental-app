import {
  CalendarDays,
  Heart,
  Image,
  MapPin,
} from "lucide-react";
import { formatDate, formatPosted, formatPrice, pluralize } from "../utils/formatters.js";

export default function ListingCard({ listing, saved, onToggleSaved }) {
  const price = listing.price ? formatPrice(listing.price) : "No price";
  const bedrooms = listing.bedrooms ?? null;
  const availableFrom = listing.availableFrom || listing.available_from;
  const availableUntil = listing.availableUntil || listing.available_until;
  const availabilityText = listing.availabilityText || listing.availability_text;
  const endAvailabilityText =
    listing.endAvailabilityText || listing.end_availability_text;
  const leaseTerm = listing.leaseTerm || listing.lease_term || "Term unknown";
  const roomType = listing.roomType || listing.room_type || "Unknown";
  const originalUrl = listing.originalUrl || listing.source_url || "#";
  const imageUrl = listing.imageUrl || listing.image_url;
  const postedAt = listing.postedAt || listing.date_posted || listing.decoded_at;
  const amenities = listing.amenities || [];
  const bedLabel =
    bedrooms === 0
      ? "Studio"
      : bedrooms
        ? `${bedrooms} ${pluralize(bedrooms, "bed")}`
        : "Beds unknown";

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
      onClick={() => {
        if (originalUrl && originalUrl !== "#") {
          window.open(originalUrl, "_blank", "noreferrer");
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && originalUrl && originalUrl !== "#") {
          event.preventDefault();
          window.open(originalUrl, "_blank", "noreferrer");
        }
      }}
      role="link"
      tabIndex={0}
      title="Open Facebook post"
    >
      <div className="relative aspect-[4/3] bg-base-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-base-content/35">
            <Image size={34} />
          </div>
        )}
        <button
          type="button"
          className={`btn btn-circle btn-sm absolute right-3 top-3 border-0 bg-base-100/90 shadow ${saved ? "text-secondary" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved(listing.id);
          }}
          aria-label={saved ? "Remove saved listing" : "Save listing"}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
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
            <span>{[listing.neighborhood, listing.borough].filter(Boolean).join(", ") || "Location unknown"}</span>
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
