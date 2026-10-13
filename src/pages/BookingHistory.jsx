import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import api from "../services/api";

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const response = await api.get("/bookings/");

      setBookings(response.data);
    } catch (error) {
      console.error("Error loading bookings:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to load bookings"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <h1>My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <h2>No bookings yet</h2>
          <p>
            Your event bookings will appear here.
          </p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div
              className="booking-card"
              key={booking.id}
            >
              <div>
                <h2>
                  Booking #{booking.id}
                </h2>

                <p>
                  <strong>Event ID:</strong>{" "}
                  {booking.event_id}
                </p>

                <p>
                  <strong>Tickets:</strong>{" "}
                  {booking.ticket_quantity}
                </p>

                <p>
                  <strong>Total:</strong>{" "}
                  ₹{booking.total_price}
                </p>

                <p>
                  <strong>Booking Date:</strong>{" "}
                  {new Date(
                    booking.created_at
                  ).toLocaleString()}
                </p>
              </div>

              <span
                className={`booking-status ${booking.booking_status.toLowerCase()}`}
              >
                {booking.booking_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookingHistory;