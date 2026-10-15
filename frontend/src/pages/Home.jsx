
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";

const initialFilters = {
  search: "",
  category: "",
  location: "",
  date_from: "",
  date_to: "",
  min_price: "",
  max_price: "",
  available_only: false,
};

function Home() {
  const [events, setEvents] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [recommendationsLoading, setRecommendationsLoading] =
    useState(true);
  const [recommendationsError, setRecommendationsError] =
    useState("");

  const [savingEventId, setSavingEventId] = useState(null);

  const isLoggedIn = Boolean(
    localStorage.getItem("access_token") ||
      localStorage.getItem("token")
  );

  // Fetch events using the currently applied filters.
  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};

        Object.entries(appliedFilters).forEach(([key, value]) => {
          if (typeof value === "boolean") {
            if (value) params[key] = value;
          } else if (String(value).trim() !== "") {
            params[key] = value;
          }
        });

        const response = await api.get("/events/", { params });
        const data = response.data;

        if (!cancelled) {
          setEvents(
            Array.isArray(data)
              ? data
              : data.events || data.items || []
          );
        }
      } catch (err) {
        console.error("Failed to load events:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load events. Please try again."
          );
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  // Load personalized and trending events independently of search filters.
  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      try {
        setRecommendationsLoading(true);
        setRecommendationsError("");

        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("token");

        const requests = [
          api.get("/recommendations/trending", {
            params: { limit: 6 },
          }),
        ];

        if (token) {
          requests.push(
            api.get("/recommendations/for-you", {
              params: { limit: 6 },
            })
          );
        }

        const responses = await Promise.allSettled(requests);

        if (cancelled) return;

        const trendingResponse = responses[0];

        if (trendingResponse.status === "fulfilled") {
          const data = trendingResponse.value.data;
          setTrending(
            data.trending_events || data.events || []
          );
        } else {
          console.error(
            "Failed to load trending events:",
            trendingResponse.reason
          );
          setTrending([]);
        }

        if (token) {
          const recommendedResponse = responses[1];

          if (recommendedResponse.status === "fulfilled") {
            const data = recommendedResponse.value.data;
            setRecommended(
              data.recommendations || data.events || []
            );
          } else {
            console.error(
              "Failed to load personalized recommendations:",
              recommendedResponse.reason
            );
            setRecommended([]);
            setRecommendationsError(
              "Unable to load personalized recommendations."
            );
          }
        } else {
          setRecommended([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load recommendations:", err);
          setRecommendationsError(
            "Unable to load recommendations right now."
          );
        }
      } finally {
        if (!cancelled) setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSearch = (event) => {
    event.preventDefault();

    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      toast.error("Start date cannot be later than end date.");
      return;
    }

    if (
      filters.min_price !== "" &&
      filters.max_price !== "" &&
      Number(filters.min_price) > Number(filters.max_price)
    ) {
      toast.error("Minimum price cannot exceed maximum price.");
      return;
    }

    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    setAppliedFilters({ ...initialFilters });
  };

  // Save an event to the logged-in user's wishlist.
  const handleSaveToWishlist = async (eventId) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      toast.info("Please log in to save events.");
      return;
    }

    try {
      setSavingEventId(eventId);

      await api.post(`/wishlist/${eventId}`);

      toast.success("Event saved to your wishlist!");
    } catch (err) {
      console.error("Failed to save event:", err);

      if (err.response?.status === 409) {
        toast.info("This event is already in your wishlist.");
      } else if (err.response?.status === 401) {
        toast.error(
          "Your session may have expired. Please log in again."
        );
      } else {
        toast.error(
          err.response?.data?.detail ||
            "Unable to save this event."
        );
      }
    } finally {
      setSavingEventId(null);
    }
  };

  // Reusable event cards for homepage sections.
  const renderEventCards = (
    eventList,
    showBookingCount = false
  ) => {
    if (!eventList.length) {
      return (
        <div className="empty-state">
          <p>No events available in this section yet.</p>
        </div>
      );
    }

    return (
      <div className="events-grid">
        {eventList.map((event) => (
          <div className="event-card" key={event.id}>
            {event.banner_image && (
              <img
                src={event.banner_image}
                alt={event.title}
                className="event-image"
                loading="lazy"
              />
            )}

            <div className="event-card-content">
              <span className="event-category">
                {event.category || "General"}
              </span>

              <h3>{event.title}</h3>

              <p>
                {event.description || "Discover this event."}
              </p>

              <p>
                📍 {event.location || "Location to be announced"}
              </p>

              <p>
                📅{" "}
                {event.event_date
                  ? new Date(event.event_date).toLocaleString()
                  : "Date to be announced"}
              </p>

              <p>🎟️ ₹{event.ticket_price ?? 0}</p>

              <p>
                Available Tickets:{" "}
                {event.available_tickets ?? "N/A"}
              </p>

              {showBookingCount && (
                <p>🔥 Bookings: {event.booking_count ?? 0}</p>
              )}

              {event.event_status && (
                <span
                  className={`status-badge status-${String(
                    event.event_status
                  ).toLowerCase()}`}
                >
                  {event.event_status}
                </span>
              )}

              <div className="event-card-actions">
                <Link
                  to={`/events/${event.id}`}
                  className="btn-primary"
                >
                  View Event
                </Link>

                <button
                  type="button"
                  onClick={() => handleSaveToWishlist(event.id)}
                  disabled={savingEventId === event.id}
                  aria-label={`Save ${event.title} to wishlist`}
                >
                  {savingEventId === event.id
                    ? "Saving..."
                    : "♡ Save to Wishlist"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Hero and search */}
      <section className="hero-section">
        <h1>Discover Amazing Events</h1>

        <p>
          Find concerts, sports, technology conferences,
          business events and more.
        </p>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            name="search"
            placeholder="Search event title or description..."
            value={filters.search}
            onChange={handleFilterChange}
          />

          <button type="submit">Search Events</button>
        </form>
      </section>

      {/* Personalized recommendations */}
      <section className="events-section">
        <div className="events-header">
          <h2>Recommended for You</h2>
        </div>

        {!isLoggedIn ? (
          <p>
            <Link to="/login">Log in</Link> to discover events
            recommended for you.
          </p>
        ) : recommendationsLoading ? (
          <p>Loading your recommendations...</p>
        ) : recommendationsError ? (
          <div className="error-message">
            <p>{recommendationsError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        ) : (
          renderEventCards(recommended)
        )}
      </section>

      {/* Trending events */}
      <section className="events-section">
        <div className="events-header">
          <h2>Trending Events 🔥</h2>
        </div>

        {recommendationsLoading ? (
          <p>Loading trending events...</p>
        ) : (
          renderEventCards(trending, true)
        )}
      </section>

      {/* Advanced search and filters */}
      <section className="events-section">
        <div className="events-header">
          <h2>Find Your Event</h2>
        </div>

        <form
          className="event-filter-form"
          onSubmit={handleSearch}
        >
          <div className="event-filter-grid">
            <div className="filter-field">
              <label htmlFor="filter-category">Category</label>
              <select
                id="filter-category"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
                <option value="Music">Music</option>
                <option value="Tech">Tech</option>
                <option value="Technology">Technology</option>
                <option value="Sports">Sports</option>
                <option value="Business">Business</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="filter-location">Location</label>
              <input
                id="filter-location"
                name="location"
                type="text"
                placeholder="Enter city or venue"
                value={filters.location}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="filter-date-from">Start date</label>
              <input
                id="filter-date-from"
                name="date_from"
                type="date"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="filter-date-to">End date</label>
              <input
                id="filter-date-to"
                name="date_to"
                type="date"
                min={filters.date_from || undefined}
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="filter-min-price">
                Minimum price (₹)
              </label>
              <input
                id="filter-min-price"
                name="min_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={filters.min_price}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="filter-max-price">
                Maximum price (₹)
              </label>
              <input
                id="filter-max-price"
                name="max_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Any price"
                value={filters.max_price}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <label className="available-filter">
            <input
              type="checkbox"
              name="available_only"
              checked={filters.available_only}
              onChange={handleFilterChange}
            />
            Show only events with available tickets
          </label>

          <div className="filter-actions">
            <button type="submit" className="btn-primary">
              Apply Filters
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </form>

        <div className="events-header">
          <h2>Upcoming Events</h2>
          {!loading && !error && (
            <p>{events.length} event(s) found</p>
          )}
        </div>

        {loading && (
          <div className="loading-page">
            <p>Loading events...</p>
          </div>
        )}

        {!loading && error && (
          <div className="error-message">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setAppliedFilters({ ...appliedFilters })}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>Try changing your search or filters.</p>
            <button
              type="button"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          events.length > 0 &&
          renderEventCards(events)}
      </section>
    </div>
  );
}

export default Home;
