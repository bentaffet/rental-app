const neighborhoodMapImages = {
  Astoria: "/neighborhood-maps/astoria.png",
  "Bedford-Stuyvesant": "/neighborhood-maps/bed-stuy.png",
  "Bed Stuy": "/neighborhood-maps/bed-stuy.png",
  "Bed-Stuy": "/neighborhood-maps/bed-stuy.png",
  Bushwick: "/neighborhood-maps/bushwick.png",
  Chelsea: "/neighborhood-maps/chelsea.png",
  "Clinton Hill": "/neighborhood-maps/clinton-hill.png",
  "Crown Heights": "/neighborhood-maps/crown-heights.png",
  "East Village": "/neighborhood-maps/east-village.png",
  FiDi: "/neighborhood-maps/financial-district.png",
  "Financial District": "/neighborhood-maps/financial-district.png",
  "Fort Greene": "/neighborhood-maps/fort-greene.png",
  Greenpoint: "/neighborhood-maps/greenpoint.png",
  Harlem: "/neighborhood-maps/harlem.png",
  "Hell's Kitchen": "/neighborhood-maps/hells-kitchen.png",
  "Hells Kitchen": "/neighborhood-maps/hells-kitchen.png",
  "Long Island City": "/neighborhood-maps/long-island-city.png",
  "Lower East Side": "/neighborhood-maps/lower-east-side.png",
  LES: "/neighborhood-maps/lower-east-side.png",
  "Murray Hill": "/neighborhood-maps/murray-hill.png",
  "Park Slope": "/neighborhood-maps/park-slope.png",
  "Prospect Heights": "/neighborhood-maps/prospect-heights.png",
  Ridgewood: "/neighborhood-maps/ridgewood.png",
  Sunnyside: "/neighborhood-maps/sunnyside.png",
  "Times Square": "/neighborhood-maps/times-square.png",
  "Upper East Side": "/neighborhood-maps/upper-east-side.png",
  UES: "/neighborhood-maps/upper-east-side.png",
  "Upper West Side": "/neighborhood-maps/upper-west-side.png",
  UWS: "/neighborhood-maps/upper-west-side.png",
  "West Village": "/neighborhood-maps/west-village.png",
  Williamsburg: "/neighborhood-maps/williamsburg.png",
};

const boroughMapImages = {
  Brooklyn: "/neighborhood-maps/brooklyn.png",
  Manhattan: "/neighborhood-maps/manhattan.png",
  Queens: "/neighborhood-maps/queens.png",
};

const normalizedNeighborhoodMapImages = Object.fromEntries(
  Object.entries(neighborhoodMapImages).map(([neighborhood, imageUrl]) => [
    normalizeLocation(neighborhood),
    imageUrl,
  ])
);

function normalizeLocation(location) {
  return String(location || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getNeighborhoodImage(neighborhood, borough = "") {
  return (
    normalizedNeighborhoodMapImages[normalizeLocation(neighborhood)] ||
    boroughMapImages[borough] ||
    "/neighborhood-maps/new-york-city.png"
  );
}
