import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
    background: "#fff",
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
    boxSizing: "border-box",
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
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "12px",
  },
  successButton: {
    width: "100%",
    padding: "13px",
    background: "#15803d",
    color: "#fff",
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
    color: "#fff",
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

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || "Invalid request").join(", ");
  }

  return error.response?.data?.message || error.message || fallback;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get("booking_id");
  const numericBookingId = Number(bookingId);

  // Correctly validate a positive integer booking ID.
  const validBookingId =
    Boolean(bookingId) &&
    /^[1-9]\d*$/.test(bookingId) &&
    Number.isSafeInteger(numericBookingId);

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

  const fetchBooking = useCallback(async () => {
    if (!validBookingId) {
      setError("Booking ID is missing or invalid in the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const bookingResponse = await api.get(
        `/bookings/${numericBookingId}`
      );

      setBooking(bookingResponse.data);

      try {
        const paymentResponse = await api.get(
          `/payments/booking/${numericBookingId}`
        );

        setExistingPayment(paymentResponse.data);
      } catch (paymentError) {
        if (paymentError.response?.status === 404) {
          setExistingPayment(null);
        } else {
          throw paymentError;
        }
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load booking details. Please try again.")
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

  // Prefer a newly validated coupon. Otherwise show the amount
  // stored in the existing payment, including its saved discount.
  const savedPaymentAmount = Number(existingPayment?.amount);

  const finalAmount = couponResult
    ? Number(couponResult.final_amount)
    : Number.isFinite(savedPaymentAmount) &&
        existingPayment?.amount != null
      ? savedPaymentAmount
      : amount;

  const savedDiscount = Number(existingPayment?.discount_amount ?? 0);

  const displayedDiscount = couponResult
    ? Number(couponResult.discount_amount ?? 0)
    : savedDiscount;

  const canPay =
    Boolean(booking) &&
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

    if (!booking || !validAmount) {
      setCouponError("Valid booking details are required.");
      return;
    }

    if (bookingStatus !== "PENDING") {
      setCouponError("A coupon can only be applied to a pending booking.");
      return;
    }

    setValidatingCoupon(true);

    try {
      const response = await api.post("/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        booking_id: numericBookingId,
      });

      setCouponResult(response.data);
      setNotice("Coupon validated successfully.");
    } catch (err) {
      setCouponError(
        getErrorMessage(err, "Unable to validate this coupon.")
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
      setError("This booking is already confirmed. You do not need to pay again.");
      return;
    }

    if (paymentStatus === "SUCCESS") {
      setError("This booking already has a successful payment.");
      return;
    }

    if (couponCode.trim() && !couponResult) {
      setError("Please apply and validate your coupon, or clear the coupon field.");
      return;
    }

    setProcessing(true);

    try {
      let paymentId = existingPayment?.id;

      const hasNewCoupon = Boolean(couponResult);

      /*
       * Reuse an existing pending payment when the user has not
       * applied a new coupon. This preserves its saved discount.
       *
       * Otherwise, POST /payments/ creates or resets the payment
       * using the current payment method and validated coupon.
       */
      const shouldCreateOrUpdatePayment =
        !existingPayment ||
        paymentStatus !== "PENDING" ||
        hasNewCoupon;

      if (shouldCreateOrUpdatePayment) {
        const createResponse = await api.post("/payments/", {
          booking_id: numericBookingId,
          payment_method: paymentMethod,
          coupon_code: couponResult?.coupon_code ?? null,
        });

        paymentId =
          createResponse.data?.id ??
          createResponse.data?.payment_id ??
          paymentId;

        if (!paymentId) {
          throw new Error(
            "The payment API did not return a payment ID. Check the POST /payments/ response."
          );
        }

        setExistingPayment(createResponse.data);
      }

      if (!paymentId) {
        throw new Error("Unable to find a payment ID for this booking.");
      }

      // Send the outcome in the JSON request body expected by FastAPI.
      const simulationResponse = await api.post(
        `/payments/${paymentId}/simulate`,
        {
          success: outcome === "success",
        }
      );

      if (outcome === "failure") {
        setCouponResult(null);
        setNotice("Payment failed as expected. You can try again.");
        await fetchBooking();
        return;
      }

      const finalPaymentId =
        simulationResponse.data?.id ??
        simulationResponse.data?.payment_id ??
        paymentId;

      navigate(
        `/payment-confirmation?payment_id=${encodeURIComponent(finalPaymentId)}`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Payment processing failed."));
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

  if (!booking) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1>Unable to Open Checkout</h1>
          <p style={styles.error}>{error || "Booking not found."}</p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={fetchBooking}
          >
            Try Again
          </button>

          <p>
            <Link to="/bookings" style={styles.link}>
              Return to My Bookings
            </Link>
          </p>
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
          Review your booking, apply a coupon, and choose a payment method.
        </p>

        <section style={styles.section}>
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
              {booking.ticket_quantity ?? booking.quantity ?? "Unavailable"}
            </strong>
          </div>

          <div style={styles.detail}>
            <span>Original Total</span>
            <strong>₹{money(amount)}</strong>
          </div>

          {displayedDiscount > 0 && (
            <>
              <div style={styles.detail}>
                <span>Saved Coupon Discount</span>
                <strong style={{ color: "#15803d" }}>
                  −₹{money(displayedDiscount)}
                </strong>
              </div>

              <div style={styles.detail}>
                <span>Discounted Payment Amount</span>
                <strong>₹{money(finalAmount)}</strong>
              </div>
            </>
          )}

          <div style={styles.detail}>
            <span>Booking Status</span>
            <span style={styles.status}>{bookingStatus}</span>
          </div>

          <div style={styles.detail}>
            <span>Payment Status</span>
            <span style={styles.status}>{paymentStatus}</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2>Apply Coupon</h2>

          <form onSubmit={handleApplyCoupon}>
            <label htmlFor="couponCode">Coupon Code</label>

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
              {validatingCoupon ? "Validating Coupon..." : "Apply Coupon"}
            </button>
          </form>

          {couponError && <p style={styles.error}>{couponError}</p>}

          {notice && <p style={styles.success}>{notice}</p>}

          {couponResult && (
            <div style={styles.section}>
              <div style={styles.detail}>
                <span>Coupon Applied</span>
                <strong>{couponResult.coupon_code}</strong>
              </div>

              <div style={styles.detail}>
                <span>Original Amount</span>
                <span>₹{money(couponResult.original_amount)}</span>
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
        </section>

        <section style={styles.section}>
          <h2>Payment Method</h2>

          <label htmlFor="paymentMethod">Select a payment method</label>

          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
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
              ₹{money(finalAmount)}
            </strong>
          </div>

          {bookingStatus === "CONFIRMED" && (
            <p style={styles.success}>
              This booking is already confirmed. You do not need to pay again.
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
              An existing pending payment was found. Its saved discount will
              be preserved unless you apply a new coupon.
            </p>
          )}

          {error && <p style={styles.error}>{error}</p>}

          {canPay && (
            <>
              <button
                type="button"
                style={{
                  ...styles.successButton,
                  opacity: processing ? 0.7 : 1,
                }}
                disabled={processing}
                onClick={() => handlePayment("success")}
              >
                {processing
                  ? "Processing..."
                  : `Simulate Successful Payment — ₹${money(finalAmount)}`}
              </button>

              <button
                type="button"
                style={{
                  ...styles.failedButton,
                  opacity: processing ? 0.7 : 1,
                }}
                disabled={processing}
                onClick={() => handlePayment("failure")}
              >
                {processing ? "Processing..." : "Simulate Failed Payment"}
              </button>
            </>
          )}

          <p style={styles.subtitle}>
            Development mode only. This simulation does not charge real money.
          </p>

          <p>
            <Link to="/bookings" style={styles.link}>
              Return to My Bookings
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}