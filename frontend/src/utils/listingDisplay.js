export function getBestPlaceName(listing) {
  return (
    listing.neighborhood ||
    listing.borough ||
    listing.city ||
    listing.state ||
    "Location unknown"
  );
}

