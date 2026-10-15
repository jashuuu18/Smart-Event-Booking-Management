
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] =
    useState(true);
  const [announcementConnection, setAnnouncementConnection] =
    useState("connecting");

  // Load event details.
  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error("EVENT ERROR:", error);
      toast.error(
        error.response?.data?.detail ||
          "Unable to load event details."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId, loadEvent]);

  // Record an event view for recommendations.
  useEffect(() => {
    if (!eventId || !localStorage.getItem("access_token")) {
      return;
    }

    api
      .post(`/recommendations/views/${eventId}`)
      .catch((error) => {
        console.warn("Event view was not recorded:", error);
      });
  }, [eventId]);

  // Load announcements already published for this event.
  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);

      const response = await api.get(
        `/announcements/${eventId}`
      );

      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : data.announcements || [];

      setAnnouncements(items);
    } catch (error) {
      console.error("ANNOUNCEMENTS ERROR:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadAnnouncements();
    }
  }, [eventId, loadAnnouncements]);

  // Receive new announcements without refreshing the page.
  useEffect(() => {
    if (!eventId) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/api/v1/announcements/ws/${eventId}`
    );

    socket.onopen = () => {
      setAnnouncementConnection("connected");
      console.log("Live announcements connected!");
    };

    socket.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);

        if (data.type !== "NEW_ANNOUNCEMENT") {
          return;
        }

        setAnnouncements((previous) => {
          if (
            previous.some(
              (item) => String(item.id) === String(data.id)
            )
          ) {
            return previous;
          }

          return [data, ...previous];
        });

        toast.info(`New announcement: ${data.title}`);
      } catch (error) {
        console.error(
          "Could not process live announcement:",
          error
        );
      }
    };

    socket.onerror = (error) => {
      console.error("Announcement WebSocket error:", error);
      setAnnouncementConnection("error");
    };

    socket.onclose = () => {
      setAnnouncementConnection("disconnected");
    };

    return () => {
      socket.close();
    };
  }, [eventId]);

  // Check whether this event is already in the user's wishlist.
  useEffect(() => {
    let cancelled = false;

    async function checkWishlist() {
      if (!localStorage.getItem("access_token")) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await api.get("/wishlist/");
        const items = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];

        const saved = items.some((item) => {
          const savedEventId =
            item.event_id ?? item.event?.id;

          return String(savedEventId) === String(eventId);
        });

        if (!cancelled) {
          setIsWishlisted(saved);
        }
      } catch (error) {
        console.warn("Could not check wishlist:", error);
      }
    }

    if (eventId) {
      checkWishlist();
    }

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Add or remove this event from the wishlist.
  const handleWishlist = async () => {
    if (!localStorage.getItem("access_token")) {
      toast.info("Please log in to use your wishlist.");
      navigate("/login");
      return;
    }

    try {
      setWishlistLoading(true);

      if (isWishlisted) {
        await api.delete(`/wishlist/${eventId}`);
        setIsWishlisted(false);
        toast.success("Removed from wishlist.");
      } else {
        await api.post(`/wishlist/${eventId}`);
        setIsWishlisted(true);
        toast.success("Added to wishlist.");
      }
    } catch (error) {
      console.error("WISHLIST ERROR:", error);
      toast.error(
        error.response?.data?.detail ||
          "Could not update your wishlist."
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  // Create a booking for this event.
  const handleBooking = async () => {
    if (!localStorage.getItem("access_token")) {
      toast.info("Please log in before booking tickets.");
      navigate("/login");
      return;
    }

    try {
      setBookingLoading(true);

      // This assumes your booking API accepts event_id and quantity.
      const response = await api.post("/bookings/", {
        event_id: Number(eventId),
        quantity: 1,
      });

      toast.success("Booking created successfully!");

      // Refresh availability after the booking.
      await loadEvent();

      // Adjust this navigation if your project uses another
      // route for displaying a booking or its QR ticket.
      const bookingId = response.data?.id;

      if (bookingId) {
        navigate(`/bookings/${bookingId}`);
      } else {
        navigate("/bookings");
      }
    } catch (error) {
      console.error("BOOKING ERROR:", error);

      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          "Booking failed. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="event-details-loading">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="event-details-error">
        <h2>Event not found</h2>
        <button onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    );
  }

  const availableTickets =
    event.available_tickets ??
    event.available_seats ??
    event.available_seats_count;

  const eventDate = event.event_date ?? event.date;
  const eventImage = event.image_url ?? event.image;

  return (
    <main className="event-details-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="back-button"
      >
        ← Back
      </button>

      <section className="event-details-card">
        {eventImage && (
          <img
            src={eventImage}
            alt={event.title || "Event"}
            className="event-details-image"
          />
        )}

        <div className="event-details-content">
          <h1>{event.title}</h1>

          {event.category && (
            <p>
              <strong>Category:</strong> {event.category}
            </p>
          )}

          {event.description && (
            <p className="event-description">
              {event.description}
            </p>
          )}

          {eventDate && (
            <p>
              <strong>Date:</strong>{" "}
              {new Date(eventDate).toLocaleString()}
            </p>
          )}

          {event.location && (
            <p>
              <strong>Location:</strong> {event.location}
            </p>
          )}

          {event.price !== undefined && (
            <p>
              <strong>Price:</strong>{" "}
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
              }).format(Number(event.price))}
            </p>
          )}

          {availableTickets !== undefined && (
            <p>
              <strong>Available tickets:</strong>{" "}
              {availableTickets}
            </p>
          )}

          <div className="event-details-actions">
            <button
              type="button"
              onClick={handleBooking}
              disabled={
                bookingLoading ||
                (availableTickets !== undefined &&
                  Number(availableTickets) <= 0)
              }
            >
              {bookingLoading
                ? "Booking..."
                : Number(availableTickets) <= 0
                  ? "Sold Out"
                  : "Book One Ticket"}
            </button>

            <button
              type="button"
              onClick={handleWishlist}
              disabled={wishlistLoading}
            >
              {wishlistLoading
                ? "Updating..."
                : isWishlisted
                  ? "♥ Remove from Wishlist"
                  : "♡ Add to Wishlist"}
            </button>
          </div>
        </div>
      </section>

      <section className="event-announcements">
        <div className="announcements-heading">
          <h2>Event Announcements</h2>
          <span>
            Live:{" "}
            {announcementConnection === "connected"
              ? "Connected"
              : announcementConnection === "connecting"
                ? "Connecting..."
                : announcementConnection === "error"
                  ? "Connection error"
                  : "Disconnected"}
          </span>
        </div>

        {announcementsLoading ? (
          <p>Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p>No announcements have been published yet.</p>
        ) : (
          <div className="announcements-list">
            {announcements.map((announcement, index) => (
              <article
                key={
                  announcement.id ??
                  `${announcement.title}-${index}`
                }
                className="announcement-card"
              >
                <h3>{announcement.title}</h3>

                <p>{announcement.message}</p>

                {announcement.announcement_type && (
                  <p>
                    <strong>Type:</strong>{" "}
                    {announcement.announcement_type}
                  </p>
                )}

                {announcement.created_at && (
                  <small>
                    {new Date(
                      announcement.created_at
                    ).toLocaleString()}
                  </small>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
