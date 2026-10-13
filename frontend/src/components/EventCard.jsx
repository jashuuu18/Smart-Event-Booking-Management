
import { Link } from "react-router-dom";

function EventCard({ event }) {
  const status = event.event_status || "UPCOMING";

  const statusColors = {
    UPCOMING: "status-upcoming",
    ONGOING: "status-ongoing",
    COMPLETED: "status-completed",
    CANCELLED: "status-cancelled",
  };

  return (
    <div className="event-card">
      {event.banner_image ? (
        <img
          src={
            event.banner_image.startsWith("http")
              ? event.banner_image
              : `http://127.0.0.1:8000${event.banner_image}`
          }
          alt={event.title}
          className="event-banner"
        />
      ) : (
        <div className="event-banner-placeholder">
          No event image
        </div>
      )}

      <div className="event-card-content">
        <div className="event-card-heading">
          <h3>{event.title}</h3>
          <span className={`event-status ${statusColors[status] || ""}`}>
            {status}
          </span>
        </div>

        <p>{event.description || "No description available."}</p>

        <p>
          <strong>Category:</strong> {event.category}
        </p>

        <p>
          <strong>Location:</strong> {event.location}
        </p>

        <p>
          <strong>Start:</strong>{" "}
          {new Date(event.event_date).toLocaleString()}
        </p>

        <p>
          <strong>End:</strong>{" "}
          {new Date(event.event_end_date).toLocaleString()}
        </p>

        <p>
          <strong>Ticket price:</strong> ₹
          {Number(event.ticket_price).toFixed(2)}
        </p>

        <p>
          <strong>Available tickets:</strong>{" "}
          {event.available_tickets}
        </p>

        <Link to={`/events/${event.id}`} className="event-details-button">
          View Details
        </Link>
      </div>
    </div>
  );
}

export default EventCard;