import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);

        const response = await api.get(`/events/${eventId}`);

        setEvent(response.data);
      } catch (error) {
        console.error("Error loading event:", error);

        toast.error(
          error.response?.data?.detail ||
          "Unable to load event"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleBooking = async () => {
    if (!user) {
      toast.info("Please login to book tickets.");
      navigate("/login");
      return;
    }

    if (quantity > event.available_tickets) {
      toast.error("Not enough tickets available.");
      return;
    }

    try {
      setBookingLoading(true);

      const response = await api.post("/bookings/", {
        event_id: event.id,
        ticket_quantity: quantity,
      });

      toast.success("Booking successful!");

      navigate(`/booking-confirmation/${response.data.id}`);
    } catch (error) {
      console.error("Booking error:", error);

      toast.error(
        error.response?.data?.detail ||
        "Booking failed"
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="loading-page">
        <h2>Event not found</h2>
      </div>
    );
  }

  return (
    <div className="event-details-page">

      {event.banner_image ? (
        <img
          src={event.banner_image}
          alt={event.title}
          className="event-details-image"
        />
      ) : (
        <div className="event-details-placeholder">
          SmartEvent
        </div>
      )}

      <div className="event-details-card">

        <span className="event-category">
          {event.category}
        </span>

        <h1>{event.title}</h1>

        <p className="event-details-description">
          {event.description ||
            "No description available."}
        </p>

        <div className="event-details-info">

          <p>
            📍 <strong>Location:</strong>{" "}
            {event.location}
          </p>

          <p>
            📅 <strong>Date:</strong>{" "}
            {new Date(
              event.event_date
            ).toLocaleString()}
          </p>

          <p>
            💰 <strong>Ticket Price:</strong>{" "}
            ₹{event.ticket_price}
          </p>

          <p>
            🎟️ <strong>Tickets Available:</strong>{" "}
            {event.available_tickets}
          </p>

        </div>

        <div className="booking-box">

          <h2>Book Your Tickets</h2>

          <label htmlFor="quantity">
            Number of Tickets
          </label>

          <input
            id="quantity"
            type="number"
            min="1"
            max={Math.min(
              10,
              event.available_tickets
            )}
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(
                  1,
                  Number(e.target.value)
                )
              )
            }
          />

          <div className="booking-total">
            <span>Total Amount</span>

            <strong>
              ₹{(
                event.ticket_price * quantity
              ).toFixed(2)}
            </strong>
          </div>

          <button
            onClick={handleBooking}
            disabled={
              bookingLoading ||
              event.available_tickets === 0
            }
            className="book-button"
          >
            {bookingLoading
              ? "Booking..."
              : event.available_tickets === 0
              ? "Sold Out"
              : "Book Tickets"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default EventDetails;