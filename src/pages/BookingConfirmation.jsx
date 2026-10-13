import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../services/api";

function BookingConfirmation() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/bookings/${bookingId}`
      );

      setBooking(response.data);
    } catch (error) {
      console.error("Error loading booking:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to load booking details"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading booking confirmation...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-card">
          <h1>Booking Not Found</h1>

          <p>
            We could not find the requested booking.
          </p>

          <Link to="/" className="confirmation-button">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">

        <div className="success-icon">
          ✓
        </div>

        <h1>Booking Confirmed!</h1>

        <p className="confirmation-message">
          Your event tickets have been booked successfully.
        </p>

        <div className="booking-summary">

          <div className="summary-row">
            <span>Booking ID</span>
            <strong>#{booking.id}</strong>
          </div>

          <div className="summary-row">
            <span>Event ID</span>
            <strong>{booking.event_id}</strong>
          </div>

          <div className="summary-row">
            <span>Number of Tickets</span>
            <strong>{booking.ticket_quantity}</strong>
          </div>

          <div className="summary-row">
            <span>Total Amount</span>
            <strong>
              ₹{booking.total_price.toFixed(2)}
            </strong>
          </div>

          <div className="summary-row">
            <span>Status</span>
            <span className="confirmed-status">
              {booking.booking_status}
            </span>
          </div>

          <div className="summary-row">
            <span>Booking Date</span>
            <strong>
              {new Date(
                booking.created_at
              ).toLocaleString()}
            </strong>
          </div>

        </div>

        <div className="confirmation-actions">

          <Link
            to="/tickets"
            className="confirmation-button primary"
          >
            View My Ticket
          </Link>

          <Link
            to="/bookings"
            className="confirmation-button secondary"
          >
            My Bookings
          </Link>

          <Link
            to="/"
            className="confirmation-button secondary"
          >
            Browse More Events
          </Link>

        </div>

      </div>
    </div>
  );
}

export default BookingConfirmation;