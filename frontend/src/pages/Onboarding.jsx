import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import { boroughs } from "../data/sampleListings.js";
import { formatPrice } from "../utils/formatters.js";

const intentOptions = ["Rent", "Sublease", "Lease takeover"];
const areaOptions = boroughs.filter((borough) => borough !== "All");

const initialPreferences = {
  intents: [],
  minPrice: 1200,
  maxPrice: 2600,
  areas: [],
  startDate: "",
};

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [error, setError] = useState("");

  function toggleArrayPreference(key, value) {
    setPreferences((current) => {
      const nextValues = current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];

      return {
        ...current,
        [key]: nextValues,
      };
    });
  }

  function setPricePreference(key, value) {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      if (key === "minPrice" && value > current.maxPrice) {
        next.maxPrice = value;
      }
      if (key === "maxPrice" && value < current.minPrice) {
        next.minPrice = value;
      }
      return next;
    });
  }

  const steps = useMemo(
    () => [
      {
        title: "What are you looking for?",
        body: (
          <div className="grid gap-2">
            {intentOptions.map((intent) => (
              <label
                key={intent}
                className="flex cursor-pointer items-center gap-3 rounded border border-base-300 p-3"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={preferences.intents.includes(intent)}
                  onChange={() => toggleArrayPreference("intents", intent)}
                />
                <span className="font-medium text-ink">{intent}</span>
              </label>
            ))}
          </div>
        ),
        isComplete: preferences.intents.length > 0,
      },
      {
        title: "What is your price range?",
        body: (
          <div className="grid gap-5">
            <label className="form-control">
              <span className="label-text mb-2">
                Minimum rent {formatPrice(preferences.minPrice)}
              </span>
              <input
                type="range"
                min="500"
                max="5000"
                step="50"
                value={preferences.minPrice}
                onChange={(event) =>
                  setPricePreference("minPrice", Number(event.target.value))
                }
                className="range range-primary"
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-2">
                Maximum rent {formatPrice(preferences.maxPrice)}
              </span>
              <input
                type="range"
                min="500"
                max="5000"
                step="50"
                value={preferences.maxPrice}
                onChange={(event) =>
                  setPricePreference("maxPrice", Number(event.target.value))
                }
                className="range range-primary"
              />
            </label>
          </div>
        ),
        isComplete: preferences.minPrice <= preferences.maxPrice,
      },
      {
        title: "Where do you want to live?",
        body: (
          <div className="grid gap-2 sm:grid-cols-2">
            {areaOptions.map((area) => (
              <label
                key={area}
                className="flex cursor-pointer items-center gap-3 rounded border border-base-300 p-3"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={preferences.areas.includes(area)}
                  onChange={() => toggleArrayPreference("areas", area)}
                />
                <span className="flex items-center gap-2 font-medium text-ink">
                  <MapPin size={16} />
                  {area}
                </span>
              </label>
            ))}
          </div>
        ),
        isComplete: preferences.areas.length > 0,
      },
      {
        title: "When do you want to start?",
        body: (
          <label className="form-control">
            <span className="label-text mb-1">Start date</span>
            <input
              className="input input-bordered"
              type="date"
              value={preferences.startDate}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              required
            />
          </label>
        ),
        isComplete: Boolean(preferences.startDate),
      },
    ],
    [preferences]
  );

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  function goNext() {
    setError("");

    if (!currentStep.isComplete) {
      setError("Please make a selection before continuing.");
      return;
    }

    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    completeOnboarding(preferences);
    navigate("/listings", { replace: true });
  }

  return (
    <div className="page-shell grid min-h-[calc(100vh-56px)] place-items-center py-10">
      <section className="w-full max-w-2xl rounded border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{currentStep.title}</h1>
          </div>
          <span className="badge badge-outline">
            {Math.round(((stepIndex + 1) / steps.length) * 100)}%
          </span>
        </div>

        <div className="min-h-44">{currentStep.body}</div>

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-base-300 pt-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={goNext}>
            {isLastStep ? (
              <>
                <Check size={18} />
                Finish
              </>
            ) : (
              <>
                Next
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
