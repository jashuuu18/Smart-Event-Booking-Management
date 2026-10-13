
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const styles = {
  page: {
    maxWidth: "760px",
    margin: "35px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },
  card: {
    background: "#ffffff",
    padding: "28px",
    borderRadius: "14px",
    boxShadow: "0 5px 24px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },
  heading: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "28px",
  },
  subtitle: {
    color: "#6b7280",
    marginBottom: "25px",
  },
  section: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "18px",
    marginTop: "18px",
  },
  detail: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    margin: "14px 0",
    flexWrap: "wrap",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "15px",
    marginTop: "8px",
    marginBottom: "12px",
  },
  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "15px",
    marginTop: "8px",
  },
  primaryButton: {
    width: "100%",
    padding: "13px",
    background: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "12px",
  },
  secondaryButton: {
    padding: "11px 15px",
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    cursor: "pointer",
  },
  successButton: {
    width: "100%",
    padding: "13px",
    background: "#15803d",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "12px",
  },
  failedButton: {
    width: "100%",
    padding: "13px",
    background: "#b91c1c",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
  },
  error: {
    padding: "12px",
    marginTop: "15px",
    borderRadius: "7px",
    background: "#fee2e2",
    color: "#991b1b",
  },
  success: {
    padding: "12px",
    marginTop: "15px",
    borderRadius: "7px",
    background: "#dcfce7",
    color: "#166534",
  },
  notice: {
    padding: "12px",
    marginTop: "15px",
    borderRadius: "7px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "14px",
  },
  status: {
    display: "inline-block",
    padding: "5px 10px",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  link: {
    color: "#4f46e5",
    textDecoration: "none",
    fontWeight: "bold",
  },
};

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [booking, setBooking] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [couponError, setCouponError] = useState("");
  const [notice, setNotice] = useState("");

  const numericBookingId = Number(bookingId);
  const validBookingId =
    bookingId &&
    Number.isInteger(numericBookingId) &&
    numericBookingId > 0;

  const fetchBooking = useCallback(async () => {
    if (!validBookingId) {
      setError("Booking ID is missing or invalid in the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/v1/bookings/${numericBookingId}`
      );

      setBooking(response.data);

      // A booking can exist without a payment record.
      // In that case, the payment lookup may return 404.
      try {
        const paymentResponse = await api.get(
          `/api/v1/payments/booking/${numericBookingId}`
        );

        setExistingPayment(paymentResponse.data);
      } catch (paymentErr) {
        if (paymentErr.response?.status === 404) {
          setExistingPayment(null);
        } else {
          // Keep the booking visible even if the payment lookup fails.
          setExistingPayment(null);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load the booking. Please check the booking ID."
      );
    } finally {
      setLoading(false);
    }
  }, [numericBookingId, validBookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const amount = Number(
    booking?.total_price ??
      booking?.total_amount ??
      booking?.amount
  );

  const validAmount = Number.isFinite(amount) && amount > 0;

  const bookingStatus = String(
    booking?.booking_status ?? "UNKNOWN"
  ).toUpperCase();

  const paymentStatus = String(
    existingPayment?.payment_status ??
      booking?.payment_status ??
      "PENDING"
  ).toUpperCase();

  const finalAmount = couponResult
    ? Number(couponResult.final_amount)
    : amount;

  const canPay =
    booking &&
    validAmount &&
    bookingStatus === "PENDING" &&
    paymentStatus !== "SUCCESS";

  async function handleApplyCoupon(event) {
    event.preventDefault();

    setCouponError("");
    setError("");
    setNotice("");
    setCouponResult(null);

    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (!booking) {
      setCouponError("Booking details have not loaded yet.");
      return;
    }

    if (bookingStatus !== "PENDING") {
      setCouponError(
        "A coupon can only be applied to a pending booking."
      );
      return;
    }

    if (!validAmount) {
      setCouponError("The booking amount is invalid.");
      return;
    }

    setValidatingCoupon(true);

    try {
      const response = await api.post(
        "/api/v1/coupons/validate",
        {
          code: couponCode.trim().toUpperCase(),
          booking_id: numericBookingId,
        }
      );

      setCouponResult(response.data);
      setNotice("Coupon validated successfully.");
    } catch (err) {
      setCouponError(
        err.response?.data?.detail ||
          "Unable to validate the coupon."
      );
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function handlePayment(outcome) {
    setError("");
    setNotice("");

    if (!booking || !validAmount) {
      setError("Valid booking details and amount are required.");
      return;
    }

    if (bookingStatus === "CANCELLED") {
      setError("This booking has been cancelled.");
      return;
    }

    if (bookingStatus === "CONFIRMED") {
      setError(
        "This booking is already confirmed. Open My Bookings to view it."
      );
      return;
    }

    if (paymentStatus === "SUCCESS") {
      setError(
        "This booking already has a successful payment. It cannot be paid for again."
      );
      return;
    }

    if (couponCode.trim() && !couponResult) {
      setError(
        "You entered a coupon code. Apply and validate it before continuing, or clear the coupon field."
      );
      return;
    }

    setProcessing(true);

    try {
      // The backend must calculate the discount and payment amount.
      const createResponse = await api.post(
        "/api/v1/payments/",
        {
          booking_id: numericBookingId,
          payment_method: paymentMethod,
          coupon_code: couponResult?.coupon_code ?? null,
        }
      );

      const paymentId =
        createResponse.data?.id ??
        createResponse.data?.payment_id;

      if (!paymentId) {
        throw new Error(
          "The backend did not return a payment ID."
        );
      }

      // Development-only simulation. This does not charge real money.
      const simulationResponse = await api.post(
        `/api/v1/payments/${paymentId}/simulate`,
        null,
        {
          params: { outcome },
        }
      );

      const finalPaymentId =
        simulationResponse.data?.id ?? paymentId;

      window.location.assign(
        `/payment-confirmation?payment_id=${encodeURIComponent(
          finalPaymentId
        )}`
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Payment processing failed."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h2>Loading checkout...</h2>
          <p>Please wait while we retrieve your booking.</p>
        </div>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1>Unable to Open Checkout</h1>
          <p style={styles.error}>{error}</p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={fetchBooking}
          >
            Try Again
          </button>

          <p>
            <Link to="/" style={styles.link}>
              Return to Home
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1>Booking Not Found</h1>
          <Link to="/" style={styles.link}>
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  const eventTitle =
    booking.event?.title ??
    booking.event_title ??
    (booking.event_id
      ? `Event #${booking.event_id}`
      : "Event details unavailable");

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Secure Checkout</h1>

        <p style={styles.subtitle}>
          Review your booking and apply a coupon before continuing.
        </p>

        <div style={styles.section}>
          <h2>Booking Details</h2>

          <div style={styles.detail}>
            <span>Booking ID</span>
            <strong>{booking.id ?? numericBookingId}</strong>
          </div>

          <div style={styles.detail}>
            <span>Event</span>
            <strong>{eventTitle}</strong>
          </div>

          <div style={styles.detail}>
            <span>Tickets</span>
            <strong>
              {booking.ticket_quantity ??
                booking.quantity ??
                "Unavailable"}
            </strong>
          </div>

          <div style={styles.detail}>
            <span>Original Total</span>
            <strong>₹{money(amount)}</strong>
          </div>

          <div style={styles.detail}>
            <span>Payment Status</span>
            <span style={styles.status}>{paymentStatus}</span>
          </div>

          <div style={styles.detail}>
            <span>Booking Status</span>
            <span style={styles.status}>{bookingStatus}</span>
          </div>
        </div>

        <div style={styles.section}>
          <h2>Apply Coupon</h2>

          <form onSubmit={handleApplyCoupon}>
            <label htmlFor="couponCode">
              Coupon Code
            </label>

            <input
              id="couponCode"
              type="text"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setCouponResult(null);
                setCouponError("");
                setNotice("");
              }}
              placeholder="Example: SAVE10"
              style={styles.input}
              disabled={
                validatingCoupon ||
                processing ||
                bookingStatus !== "PENDING"
              }
            />

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={
                validatingCoupon ||
                processing ||
                bookingStatus !== "PENDING"
              }
            >
              {validatingCoupon
                ? "Validating Coupon..."
                : "Apply Coupon"}
            </button>
          </form>

          {couponError && (
            <p style={styles.error}>{couponError}</p>
          )}

          {notice && (
            <p style={styles.success}>{notice}</p>
          )}

          {couponResult && (
            <div style={styles.section}>
              <div style={styles.detail}>
                <span>Coupon Applied</span>
                <strong>{couponResult.coupon_code}</strong>
              </div>

              <div style={styles.detail}>
                <span>Original Amount</span>
                <span>
                  ₹{money(couponResult.original_amount)}
                </span>
              </div>

              <div style={styles.detail}>
                <span>Discount</span>
                <strong style={{ color: "#15803d" }}>
                  −₹{money(couponResult.discount_amount)}
                </strong>
              </div>

              <div style={styles.detail}>
                <strong>Final Amount</strong>
                <strong style={{ color: "#15803d" }}>
                  ₹{money(couponResult.final_amount)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2>Payment Method</h2>

          <label htmlFor="paymentMethod">
            Select a payment method
          </label>

          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value)
            }
            style={styles.select}
            disabled={processing || !canPay}
          >
            <option value="UPI">UPI</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="NET_BANKING">Net Banking</option>
          </select>

          <div style={styles.detail}>
            <span>Amount to Pay</span>
            <strong style={{ fontSize: "22px" }}>
              ₹{money(
                Number.isFinite(finalAmount)
                  ? finalAmount
                  : amount
              )}
            </strong>
          </div>

          {bookingStatus === "CONFIRMED" && (
            <p style={styles.success}>
              This booking is already confirmed. You do not
              need to pay again.
            </p>
          )}

          {paymentStatus === "SUCCESS" && (
            <p style={styles.success}>
              Payment has already succeeded for this booking.
            </p>
          )}

          {bookingStatus === "CANCELLED" && (
            <p style={styles.error}>
              This booking has been cancelled and cannot be paid.
            </p>
          )}

          {existingPayment?.payment_status === "PENDING" && (
            <p style={styles.notice}>
              An existing pending payment was found. If the
              backend rejects a new payment, the existing
              payment must be updated or reused by the backend
              before a coupon can be applied to it.
            </p>
          )}

          {error && (
            <p style={styles.error}>{error}</p>
          )}

          {canPay && (
            <>
              <button
                type="button"
                style={styles.successButton}
                disabled={processing}
                onClick={() => handlePayment("success")}
              >
                {processing
                  ? "Processing..."
                  : `Simulate Successful Payment — ₹${money(
                      Number.isFinite(finalAmount)
                        ? finalAmount
                        : amount
                    )}`}
              </button>

              <button
                type="button"
                style={styles.failedButton}
                disabled={processing}
                onClick={() => handlePayment("failure")}
              >
                {processing
                  ? "Processing..."
                  : "Simulate Failed Payment"}
              </button>
            </>
          )}

          <p style={styles.subtitle}>
            Development mode only. No real money is charged.
          </p>

          <p>
            <Link to="/" style={styles.link}>
              Return to Home
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
