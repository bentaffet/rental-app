import { useState } from "react";
import { Image } from "lucide-react";
import { getNeighborhoodImage } from "../data/neighborhoodImages.js";

export default function ListingImage({ listing, className = "" }) {
  const imageUrl = listing.imageUrl || listing.image_url;
  const fallbackImageUrl = getNeighborhoodImage(listing.neighborhood, listing.borough);
  const [failedImageUrls, setFailedImageUrls] = useState([]);
  const isPrimaryImageAvailable =
    imageUrl && !failedImageUrls.includes(imageUrl);
  const isFallbackImageAvailable =
    fallbackImageUrl && !failedImageUrls.includes(fallbackImageUrl);
  const displayImageUrl = isPrimaryImageAvailable
    ? imageUrl
    : isFallbackImageAvailable
      ? fallbackImageUrl
      : "";
  const isShowingFallbackImage =
    Boolean(displayImageUrl) && displayImageUrl === fallbackImageUrl;

  if (!displayImageUrl) {
    return (
      <div className={`grid place-items-center bg-base-200 text-base-content/35 ${className}`}>
        <Image size={34} />
      </div>
    );
  }

  return (
    <img
      src={displayImageUrl}
      alt={isShowingFallbackImage ? `${listing.neighborhood || "NYC"} map` : ""}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={() => {
        setFailedImageUrls((current) =>
          current.includes(displayImageUrl)
            ? current
            : [...current, displayImageUrl]
        );
      }}
    />
  );
}
