import { boroughs } from "../data/sampleListings.js";
import { formatPrice } from "../utils/formatters.js";

const priceMinimum = 0;
const priceMaximum = 6000;
const priceStep = 250;

const priceOptions = Array.from(
  { length: priceMaximum / priceStep + 1 },
  (_, index) => index * priceStep
);

export default function FilterPanel({ filters, monthOptions, onChange }) {
  const setFilter = (key, value) => onChange({ ...filters, [key]: value });
  const setPrice = (key, value) => {
    const nextValue = Number(value);
    const nextFilters = { ...filters, [key]: nextValue };

    if (key === "minPrice" && nextValue > filters.maxPrice) {
      nextFilters.maxPrice = nextValue;
    }

    if (key === "maxPrice" && nextValue < filters.minPrice) {
      nextFilters.minPrice = nextValue;
    }

    onChange(nextFilters);
  };

  const minPercent = (filters.minPrice / priceMaximum) * 100;
  const maxPercent = (filters.maxPrice / priceMaximum) * 100;

  return (
    <aside className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-5 border-b border-base-300 pb-4">
        <h2 className="font-semibold text-ink">Filters</h2>
      </div>

      <div className="space-y-5">
        <label className="form-control">
          <span className="label-text mb-2 font-medium text-ink">Borough</span>
          <select
            className="select select-bordered w-full"
            value={filters.borough}
            onChange={(event) => setFilter("borough", event.target.value)}
          >
            {boroughs.map((borough) => (
              <option key={borough} value={borough}>
                {borough === "All" ? "All boroughs" : borough}
              </option>
            ))}
          </select>
        </label>

        <div className="border-t border-base-300 pt-5">
          <div className="mb-3 font-medium text-ink">Monthly price</div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <label className="form-control min-w-0">
              <span className="label-text mb-1.5 text-xs text-base-content/60">Max price</span>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.maxPrice}
                onChange={(event) => setPrice("maxPrice", event.target.value)}
              >
                {priceOptions.slice(1).map((price) => (
                  <option key={price} value={price}>
                    {price === priceMaximum ? "No max" : formatPrice(price)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control min-w-0">
              <span className="label-text mb-1.5 text-xs text-base-content/60">Min price</span>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.minPrice}
                onChange={(event) => setPrice("minPrice", event.target.value)}
              >
                {priceOptions.slice(0, -1).map((price) => (
                  <option key={price} value={price}>
                    {price === priceMinimum ? "No min" : formatPrice(price)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className="price-range mt-5"
            style={{ "--range-start": `${minPercent}%`, "--range-end": `${maxPercent}%` }}
          >
            <div className="price-range-track" aria-hidden="true" />
            <input
              type="range"
              min={priceMinimum}
              max={priceMaximum}
              step={priceStep}
              value={filters.minPrice}
              onChange={(event) => setPrice("minPrice", event.target.value)}
              aria-label="Minimum monthly price"
            />
            <input
              type="range"
              min={priceMinimum}
              max={priceMaximum}
              step={priceStep}
              value={filters.maxPrice}
              onChange={(event) => setPrice("maxPrice", event.target.value)}
              aria-label="Maximum monthly price"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-base-content/55">
            <span>{filters.minPrice ? formatPrice(filters.minPrice) : "Any"}</span>
            <span>{filters.maxPrice === priceMaximum ? "Any" : formatPrice(filters.maxPrice)}</span>
          </div>
        </div>

        <div className="border-t border-base-300 pt-5">
          <div className="mb-3 font-medium text-ink">Availability</div>
          <div className="space-y-3">
            <label className="form-control">
              <span className="label-text mb-1.5 text-xs text-base-content/60">Start month</span>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.startMonth}
                onChange={(event) => setFilter("startMonth", event.target.value)}
              >
                <option value="">Any month</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text mb-1.5 text-xs text-base-content/60">End month</span>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.endMonth}
                onChange={(event) => setFilter("endMonth", event.target.value)}
              >
                <option value="">Any month</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <label className="form-control border-t border-base-300 pt-5">
          <span className="label-text mb-2 font-medium text-ink">Posted</span>
          <select
            className="select select-bordered select-sm w-full"
            value={filters.postedWithinDays}
            onChange={(event) => setFilter("postedWithinDays", event.target.value)}
          >
            <option value="">Any time</option>
            <option value="1">Last 1 day</option>
            <option value="2">Last 2 days</option>
            <option value="3">Last 3 days</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </div>
    </aside>
  );
}
