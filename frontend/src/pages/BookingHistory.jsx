
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function BookingHistory() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bookings/");

      const bookingList = Array.isArray(response.data)
        ? response.data
        : response.data?.bookings || [];

      setBookings(bookingList);

      // Load saved payment and refund information for each booking.
      const paymentEntries = await Promise.all(
        bookingList.map(async (booking) => {
          try {
            const paymentResponse = await api.get(
              `/payments/booking/${booking.id}`
            );

            return [booking.id, paymentResponse.data];
          } catch (paymentError) {
            if (paymentError.response?.status === 404) {
              return [booking.id, null];
            }

            console.error(
              `Unable to load payment for booking ${booking.id}:`,
              paymentError
            );

            return [booking.id, null];
          }
        })
      );

      setPaymentsByBooking(Object.fromEntries(paymentEntries));
    } catch (err) {
      console.error("Unable to load bookings:", err);

      setError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to load your bookings. Please log in and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const proceedToPayment = (bookingId) => {
    if (!bookingId) {
      setError("Booking ID is missing. Please refresh your bookings.");
      return;
    }

    navigate(
      `/checkout?booking_id=${encodeURIComponent(bookingId)}`
    );
  };

  const cancelBooking = async (bookingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError("");

      await api.patch(`/bookings/${bookingId}/cancel`);

      // Reload bookings and payments so the refund status is refreshed.
      await loadBookings();

      window.alert("Booking cancelled successfully.");
    } catch (err) {
      console.error("Unable to cancel booking:", err);

      setError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to cancel this booking."
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <p style={styles.message}>
        Loading your bookings...
      </p>
    );
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>My Booking History</h1>

      <p style={styles.subtitle}>
        View your bookings, ticket details, coupon discounts,
        payment status, and refund status.
      </p>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        style={styles.refreshButton}
        onClick={loadBookings}
        disabled={loading}
      >
        Refresh Bookings
      </button>

      {bookings.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No bookings found</h2>
          <p>You have no bookings yet.</p>

          <button
            type="button"
            style={styles.payButton}
            onClick={() => navigate("/events")}
          >
            Explore Events
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {bookings.map((booking) => {
            const status = String(
              booking.booking_status || "UNKNOWN"
            ).toUpperCase();

            const payment = paymentsByBooking[booking.id];

            const paymentStatus = String(
              payment?.payment_status ??
                booking.payment_status ??
                "NOT CREATED"
            ).toUpperCase();

            // Prefer the saved refund status from the payment API.
            const refundStatus = String(
              payment?.refund_status ??
                booking.refund_status ??
                "NOT_APPLICABLE"
            ).toUpperCase();

            const originalAmount = Number(
              booking.total_price ??
                booking.total_amount ??
                booking.amount ??
                0
            );

            const discountAmount = Number(
              payment?.discount_amount ?? 0
            );

            const hasSavedPaymentAmount =
              payment?.amount !== null &&
              payment?.amount !== undefined &&
              Number.isFinite(Number(payment.amount));

            const finalAmount = hasSavedPaymentAmount
              ? Number(payment.amount)
              : originalAmount;

            const couponCode =
              payment?.coupon?.code ??
              payment?.coupon_code ??
              payment?.coupon?.coupon_code ??
              null;

            const isPending = status === "PENDING";
            const isConfirmed = status === "CONFIRMED";
            const isCancelled = status === "CANCELLED";

            const canCancel =
              isPending || isConfirmed;

            return (
              <article
                key={booking.id}
                style={styles.card}
              >
                <div style={styles.cardHeader}>
                  <h2 style={styles.eventTitle}>
                    {booking.event_title ||
                      booking.event?.title ||
                      `Event #${booking.event_id}`}
                  </h2>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...getBookingStatusStyle(status),
                    }}
                  >
                    {formatStatus(status)}
                  </span>
                </div>

                {booking.event_description && (
                  <p style={styles.description}>
                    {booking.event_description}
                  </p>
                )}

                <div style={styles.details}>
                  <p>
                    <strong>Booking ID:</strong>{" "}
                    {booking.id}
                  </p>

                  <p>
                    <strong>Event ID:</strong>{" "}
                    {booking.event_id}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {booking.event_location ||
                      booking.event?.location ||
                      "Not specified"}
                  </p>

                  <p>
                    <strong>Event date:</strong>{" "}
                    {booking.event_date
                      ? new Date(
                          booking.event_date
                        ).toLocaleString()
                      : "Not specified"}
                  </p>

                  <p>
                    <strong>Tickets:</strong>{" "}
                    {booking.ticket_quantity ??
                      booking.quantity ??
                      "Not specified"}
                  </p>

                  <p>
                    <strong>Booked on:</strong>{" "}
                    {booking.created_at
                      ? new Date(
                          booking.created_at
                        ).toLocaleString()
                      : "Not specified"}
                  </p>
                </div>

                <section style={styles.priceBox}>
                  <h3 style={styles.sectionTitle}>
                    Payment Summary
                  </h3>

                  <p style={styles.priceRow}>
                    <span>Original price</span>
                    <strong>
                      ₹{money(originalAmount)}
                    </strong>
                  </p>

                  <p style={styles.priceRow}>
                    <span>Coupon code</span>
                    <strong>
                      {couponCode || "Not applied"}
                    </strong>
                  </p>

                  <p style={styles.priceRow}>
                    <span>Discount</span>
                    <strong style={styles.discount}>
                      −₹{money(discountAmount)}
                    </strong>
                  </p>

                  <div style={styles.priceDivider} />

                  <p style={styles.priceRow}>
                    <strong>Final payment amount</strong>
                    <strong style={styles.finalAmount}>
                      ₹{money(finalAmount)}
                    </strong>
                  </p>
                </section>

                <section style={styles.statusSection}>
                  <p style={styles.statusRow}>
                    <strong>Booking status</strong>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getBookingStatusStyle(status),
                      }}
                    >
                      {formatStatus(status)}
                    </span>
                  </p>

                  <p style={styles.statusRow}>
                    <strong>Payment status</strong>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getPaymentStatusStyle(
                          paymentStatus
                        ),
                      }}
                    >
                      {formatStatus(paymentStatus)}
                    </span>
                  </p>

                  <p style={styles.statusRow}>
                    <strong>Refund status</strong>

                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getRefundStatusStyle(
                          refundStatus
                        ),
                      }}
                    >
                      {formatStatus(refundStatus)}
                    </span>
                  </p>
                </section>

                {payment?.payment_method && (
                  <p>
                    <strong>Payment method:</strong>{" "}
                    {payment.payment_method}
                  </p>
                )}

                {isPending && (
                  <div style={styles.actions}>
                    <button
                      type="button"
                      onClick={() =>
                        proceedToPayment(booking.id)
                      }
                      style={styles.payButton}
                    >
                      {paymentStatus === "FAILED"
                        ? "Retry Payment"
                        : "Proceed to Payment"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        cancellingId === booking.id
                      }
                      onClick={() =>
                        cancelBooking(booking.id)
                      }
                      style={{
                        ...styles.cancelButton,
                        ...(cancellingId === booking.id
                          ? styles.disabledButton
                          : {}),
                      }}
                    >
                      {cancellingId === booking.id
                        ? "Cancelling..."
                        : "Cancel Booking"}
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div style={styles.successMessage}>
                    <strong>Booking confirmed.</strong>
                    <p>
                      Your booking has been confirmed.
                    </p>

                    <div style={styles.actions}>
                      <button
                        type="button"
                        disabled={
                          cancellingId === booking.id
                        }
                        onClick={() =>
                          cancelBooking(booking.id)
                        }
                        style={{
                          ...styles.cancelButton,
                          ...(cancellingId === booking.id
                            ? styles.disabledButton
                            : {}),
                        }}
                      >
                        {cancellingId === booking.id
                          ? "Cancelling..."
                          : "Cancel Booking"}
                      </button>
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div style={styles.cancelledMessage}>
                    <strong>
                      This booking has been cancelled.
                    </strong>

                    {paymentStatus === "SUCCESS" &&
                      refundStatus === "PENDING" && (
                        <p>
                          Your refund is pending. Check
                          the refund status again later.
                        </p>
                      )}

                    {refundStatus === "COMPLETED" && (
                      <p>
                        The refund is marked as completed.
                      </p>
                    )}

                    {refundStatus === "FAILED" && (
                      <p>
                        The refund failed. Please contact
                        support for assistance.
                      </p>
                    )}

                    {refundStatus === "NOT_APPLICABLE" && (
                      <p>
                        No refund is currently applicable
                        to this booking.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function money(value) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? amount.toFixed(2)
    : "0.00";
}

function formatStatus(value) {
  return String(value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getBookingStatusStyle(status) {
  switch (status) {
    case "CONFIRMED":
      return styles.confirmedBadge;
    case "CANCELLED":
      return styles.cancelledBadge;
    case "PENDING":
      return styles.pendingBadge;
    default:
      return styles.neutralBadge;
  }
}

function getPaymentStatusStyle(status) {
  switch (status) {
    case "SUCCESS":
    case "SUCCEEDED":
    case "COMPLETED":
    case "PAID":
      return styles.confirmedBadge;
    case "FAILED":
      return styles.cancelledBadge;
    case "PENDING":
      return styles.pendingBadge;
    default:
      return styles.neutralBadge;
  }
}

function getRefundStatusStyle(status) {
  switch (status) {
    case "COMPLETED":
    case "SUCCESS":
    case "SUCCEEDED":
      return styles.confirmedBadge;
    case "FAILED":
      return styles.cancelledBadge;
    case "PENDING":
    case "PROCESSING":
      return styles.pendingBadge;
    case "NOT_APPLICABLE":
      return styles.neutralBadge;
    default:
      return styles.neutralBadge;
  }
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "30px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },

  heading: {
    marginBottom: "8px",
  },

  subtitle: {
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: "24px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },

  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    background: "#fff",
    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.06)",
    overflowWrap: "anywhere",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "12px",
  },

  eventTitle: {
    fontSize: "21px",
    margin: 0,
    flex: "1 1 160px",
  },

  description: {
    color: "#4b5563",
    lineHeight: 1.6,
  },

  details: {
    lineHeight: 1.5,
    fontSize: "14px",
  },

  sectionTitle: {
    fontSize: "16px",
    marginTop: 0,
    marginBottom: "12px",
  },

  priceBox: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "16px",
    marginBottom: "16px",
  },

  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    margin: "10px 0",
    fontSize: "14px",
  },

  priceDivider: {
    borderTop: "1px solid #d1d5db",
    margin: "12px 0",
  },

  discount: {
    color: "#15803d",
  },

  finalAmount: {
    color: "#15803d",
    fontSize: "18px",
  },

  statusSection: {
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 0",
    margin: "16px 0",
  },

  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    margin: "12px 0",
  },

  statusBadge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  confirmedBadge: {
    background: "#dcfce7",
    color: "#166534",
  },

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
  },

  cancelledBadge: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  neutralBadge: {
    background: "#e5e7eb",
    color: "#374151",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px",
  },

  payButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 14px",
    cursor: "pointer",
  },

  cancelButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 14px",
    cursor: "pointer",
  },

  refreshButton: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 14px",
    cursor: "pointer",
    marginBottom: "10px",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  successMessage: {
    color: "#166534",
    background: "#f0fdf4",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "16px",
  },

  cancelledMessage: {
    color: "#991b1b",
    background: "#fef2f2",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "16px",
  },

  error: {
    color: "#991b1b",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
  },

  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#f9fafb",
    borderRadius: "10px",
    marginTop: "20px",
  },

  message: {
    textAlign: "center",
    padding: "40px 20px",
  },
};
