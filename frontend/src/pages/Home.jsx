import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Home() {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (category) {
        params.category = category;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await api.get("/events/", {
        params,
      });

      setEvents(response.data);
    } catch (err) {
      console.error("Failed to load events:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load events. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [category]);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchEvents();
  };

  return (
    <div className="page-container">

      {/* Hero Section */}
      <section className="hero-section">
        <h1>Discover Amazing Events</h1>

        <p>
          Find concerts, sports, technology conferences,
          business events and more.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="search-form"
        >
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button type="submit">
            Search
          </button>
        </form>
      </section>

      {/* Filters */}
      <section className="events-section">

        <div className="events-header">
          <h2>Upcoming Events</h2>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Music">Music</option>
            <option value="Tech">Tech</option>
            <option value="Sports">Sports</option>
            <option value="Business">Business</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading-page">
            <p>Loading events...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="error-message">
            <p>{error}</p>

            <button onClick={fetchEvents}>
              Try Again
            </button>
          </div>
        )}

        {/* No Events */}
        {!loading && !error && events.length === 0 && (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>
              Try another search or category.
            </p>
          </div>
        )}

        {/* Events */}
        {!loading && !error && events.length > 0 && (
          <div className="events-grid">

            {events.map((event) => (
              <div
                className="event-card"
                key={event.id}
              >

                {/* Banner */}
                {event.banner_image && (
                  <img
                    src={event.banner_image}
                    alt={event.title}
                    className="event-image"
                  />
                )}

                <div className="event-card-content">

                  <span className="event-category">
                    {event.category}
                  </span>

                  <h3>{event.title}</h3>

                  <p>
                    {event.description}
                  </p>

                  <p>
                    📍 {event.location}
                  </p>

                  <p>
                    📅{" "}
                    {new Date(
                      event.event_date
                    ).toLocaleString()}
                  </p>

                  <p>
                    🎟️ ₹{event.ticket_price}
                  </p>

                  <p>
                    Available Tickets:{" "}
                    {event.available_tickets}
                  </p>

                  <span
                    className={`status-badge status-${event.event_status.toLowerCase()}`}
                  >
                    {event.event_status}
                  </span>

                  <Link
                    to={`/events/${event.id}`}
                    className="btn-primary"
                  >
                    View Event
                  </Link>

                </div>
              </div>
            ))}

          </div>
        )}

      </section>
    </div>
  );
}

export default Home;