
import { useEffect, useState } from "react";
import api from "../services/api";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = async () => {
    try {
      setError("");
      const response = await api.get("/bookings/");
      setBookings(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your bookings. Please log in and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const cancelBooking = async (bookingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError("");

      await api.patch(`/bookings/${bookingId}/cancel`);

      await loadBookings();
      window.alert("Booking cancelled successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to cancel this booking."
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <p style={styles.message}>Loading your bookings...</p>;
  }

  return (
    <main style={styles.container}>
      <h1>My Booking History</h1>
      <p style={styles.subtitle}>
        View your bookings, event details, and booking status.
      </p>

      {error && <p style={styles.error}>{error}</p>}

      {bookings.length === 0 ? (
        <p style={styles.message}>You have no bookings yet.</p>
      ) : (
        <div style={styles.grid}>
          {bookings.map((booking) => (
            <article key={booking.id} style={styles.card}>
              <h2>{booking.event_title || `Event #${booking.event_id}`}</h2>

              {booking.event_description && (
                <p>{booking.event_description}</p>
              )}

              <p>
                <strong>Booking ID:</strong> {booking.id}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {booking.event_location || "Not specified"}
              </p>

              <p>
                <strong>Event date:</strong>{" "}
                {booking.event_date
                  ? new Date(booking.event_date).toLocaleString()
                  : "Not specified"}
              </p>

              <p>
                <strong>Tickets:</strong> {booking.ticket_quantity}
              </p>

              <p>
                <strong>Total price:</strong>{" "}
                {Number(booking.total_price).toFixed(2)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span style={styles.status}>
                  {booking.booking_status}
                </span>
              </p>

              <p>
                <strong>Booked on:</strong>{" "}
                {booking.created_at
                  ? new Date(booking.created_at).toLocaleString()
                  : "Not specified"}
              </p>

              {booking.booking_status === "PENDING" && (
                <button
                  type="button"
                  disabled={cancellingId === booking.id}
                  onClick={() => cancelBooking(booking.id)}
                  style={styles.cancelButton}
                >
                  {cancellingId === booking.id
                    ? "Cancelling..."
                    : "Cancel Booking"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "30px auto",
    padding: "20px",
  },
  subtitle: {
    color: "#666",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  },
  status: {
    fontWeight: "bold",
  },
  cancelButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  error: {
    color: "#b91c1c",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "6px",
  },
  message: {
    textAlign: "center",
    padding: "40px 20px",
  },
};
