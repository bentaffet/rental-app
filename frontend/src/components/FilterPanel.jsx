import { ArrowDownUp, CalendarDays, MapPin } from "lucide-react";
import { boroughs } from "../data/sampleListings.js";
import { formatPrice } from "../utils/formatters.js";

export default function FilterPanel({ filters, onChange }) {
  const setFilter = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <section className="rounded border border-base-300 bg-base-100 p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1.2fr_1.1fr]">
        <label className="form-control">
          <span className="label-text mb-1 flex items-center gap-1">
            <MapPin size={14} />
            Area
          </span>
          <div className="flex gap-2">
            <select
              className="select select-bordered select-sm min-w-0 flex-1"
              value={filters.borough}
              onChange={(event) => setFilter("borough", event.target.value)}
            >
              {boroughs.map((borough) => (
                <option key={borough}>{borough}</option>
              ))}
            </select>
          </div>
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Max rent {formatPrice(filters.maxPrice)}</span>
          <input
            type="range"
            min="1200"
            max="3500"
            step="50"
            value={filters.maxPrice}
            onChange={(event) => setFilter("maxPrice", Number(event.target.value))}
            className="range range-primary range-sm"
          />
        </label>

        <div>
          <label className="form-control">
            <span className="label-text mb-1 flex items-center gap-1">
              <CalendarDays size={14} />
              Start
            </span>
            <input
              className="input input-bordered input-sm"
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilter("startDate", event.target.value)}
            />
          </label>
          <label className="label mt-2 cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={filters.startMonthOnly}
              onChange={(event) => setFilter("startMonthOnly", event.target.checked)}
            />
            <span className="label-text">Match start month</span>
          </label>
        </div>

        <div>
          <label className="form-control">
            <span className="label-text mb-1 flex items-center gap-1">
              <CalendarDays size={14} />
              End
            </span>
            <input
              className="input input-bordered input-sm"
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilter("endDate", event.target.value)}
            />
          </label>
          <label className="label mt-2 cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={filters.endMonthOnly}
              onChange={(event) => setFilter("endMonthOnly", event.target.checked)}
            />
            <span className="label-text">Match end month</span>
          </label>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-base-300 pt-3">
        <ArrowDownUp size={15} className="text-base-content/50" />
        <select
          className="select select-bordered select-sm w-full sm:w-52"
          value={filters.sortBy}
          onChange={(event) => setFilter("sortBy", event.target.value)}
        >
          <option value="none">Recommended</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
      </div>
    </section>
  );
}
