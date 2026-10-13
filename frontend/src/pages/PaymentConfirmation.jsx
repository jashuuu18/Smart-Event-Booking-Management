
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayment() {
      if (!paymentId) {
        setError("Payment ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/api/v1/payments/${paymentId}`
        );
        setPayment(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to verify payment status."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [paymentId]);

  if (loading) {
    return (
      <main style={styles.container}>
        <h2>Checking payment status...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.container}>
        <h1>Payment Status Unavailable</h1>
        <p style={styles.error}>{error}</p>
        <Link to="/" style={styles.link}>
          Return to Home
        </Link>
      </main>
    );
  }

  const success = payment?.payment_status === "SUCCESS";
  const failed = payment?.payment_status === "FAILED";

  const amountPaid = Number(payment?.amount ?? 0);
  const discountAmount = Number(payment?.discount_amount ?? 0);
  const originalAmount = amountPaid + discountAmount;

  return (
    <main style={styles.container}>
      <div
        style={{
          ...styles.icon,
          background: success
            ? "#dcfce7"
            : failed
            ? "#fee2e2"
            : "#fef3c7",
          color: success
            ? "#166534"
            : failed
            ? "#991b1b"
            : "#92400e",
        }}
      >
        {success ? "✓" : failed ? "✕" : "!"}
      </div>

      <h1>
        {success
          ? "Payment Successful!"
          : failed
          ? "Payment Failed"
          : "Payment Status"}
      </h1>

      <p>
        {success
          ? "Your payment has been confirmed."
          : `Current status: ${payment?.payment_status ?? "Unknown"}`}
      </p>

      <div style={styles.summary}>
        <h2>Payment Summary</h2>

        <div style={styles.row}>
          <span>Original amount</span>
          <span>₹{originalAmount.toFixed(2)}</span>
        </div>

        <div style={styles.row}>
          <span>Coupon discount</span>
          <span style={styles.discount}>
            −₹{discountAmount.toFixed(2)}
          </span>
        </div>

        {payment?.coupon_id != null && (
          <div style={styles.row}>
            <span>Coupon ID</span>
            <span>{payment.coupon_id}</span>
          </div>
        )}

        <div style={styles.divider} />

        <div style={styles.totalRow}>
          <strong>Amount paid / payable</strong>
          <strong>₹{amountPaid.toFixed(2)}</strong>
        </div>
      </div>

      <div style={styles.details}>
        <p>
          <strong>Payment ID:</strong> {payment?.id}
        </p>
        <p>
          <strong>Booking ID:</strong> {payment?.booking_id}
        </p>
        <p>
          <strong>Payment method:</strong>{" "}
          {payment?.payment_method ?? "Unavailable"}
        </p>
        <p>
          <strong>Payment status:</strong>{" "}
          {payment?.payment_status ?? "Unknown"}
        </p>
        <p>
          <strong>Transaction ID:</strong>{" "}
          {payment?.transaction_id ?? "Not assigned"}
        </p>
      </div>

      <Link to="/" style={styles.link}>
        Return to Home
      </Link>
    </main>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "60px auto",
    padding: "30px",
    textAlign: "center",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    fontFamily: "Arial, sans-serif",
  },
  icon: {
    width: "60px",
    height: "60px",
    margin: "0 auto",
    borderRadius: "50%",
    fontSize: "36px",
    lineHeight: "60px",
  },
  summary: {
    marginTop: "25px",
    padding: "20px",
    background: "#f9fafb",
    borderRadius: "12px",
    textAlign: "left",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    margin: "14px 0",
  },
  discount: {
    color: "#15803d",
    fontWeight: "bold",
  },
  divider: {
    borderTop: "1px solid #d1d5db",
    margin: "16px 0",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "17px",
  },
  details: {
    marginTop: "20px",
    textAlign: "left",
    overflowWrap: "anywhere",
  },
  error: {
    color: "#b91c1c",
  },
  link: {
    display: "inline-block",
    marginTop: "20px",
    padding: "12px 20px",
    background: "#4f46e5",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "8px",
  },
};
