
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";

function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/wishlist/");
      setItems(response.data.wishlist || []);
    } catch (err) {
      console.error("Failed to load wishlist:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load your wishlist. Please log in and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (eventId) => {
    try {
      setRemovingId(eventId);

      await api.delete(`/wishlist/${eventId}`);

      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.event_id !== eventId
        )
      );

      toast.success("Event removed from wishlist");
    } catch (err) {
      console.error("Failed to remove wishlist item:", err);

      toast.error(
        err.response?.data?.detail ||
          "Could not remove this event."
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2>My Wishlist</h2>
        <p>Loading your saved events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h2>My Wishlist</h2>
        <p className="error-message">{error}</p>
        <button onClick={fetchWishlist}>Try Again</button>
        <p>
          <Link to="/login">Go to Login</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="events-section">
        <div className="events-header">
          <h1>My Wishlist ❤️</h1>
          <span>{items.length} saved event(s)</span>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <h3>Your wishlist is empty</h3>
            <p>Save events you are interested in to find them here.</p>
            <Link to="/" className="btn-primary">
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="events-grid">
            {items.map((item) => {
              const event = item.event;

              return (
                <div className="event-card" key={item.id}>
                  {event.banner_image && (
                    <img
                      src={event.banner_image}
                      alt={event.title}
                      className="event-image"
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

                    <p>📍 {event.location}</p>

                    <p>
                      📅{" "}
                      {event.event_date
                        ? new Date(
                            event.event_date
                          ).toLocaleString()
                        : "Date to be announced"}
                    </p>

                    <p>🎟️ ₹{event.ticket_price}</p>

                    <div className="wishlist-actions">
                      <Link
                        to={`/events/${event.id}`}
                        className="btn-primary"
                      >
                        View Event
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemove(item.event_id)
                        }
                        disabled={removingId === item.event_id}
                      >
                        {removingId === item.event_id
                          ? "Removing..."
                          : "Remove ❤️"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Wishlist;
