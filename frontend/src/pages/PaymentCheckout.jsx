
// import { useEffect, useState } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import api from "../services/api";

// export default function PaymentCheckout() {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();

//   const bookingId = searchParams.get("booking_id");

//   const [booking, setBooking] = useState(null);
//   const [payment, setPayment] = useState(null);
//   const [paymentMethod] = useState("UPI");
//   const [loading, setLoading] = useState(true);
//   const [processing, setProcessing] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let cancelled = false;

//     async function loadCheckout() {
//       if (
//         !bookingId ||
//         !Number.isInteger(Number(bookingId)) ||
//         Number(bookingId) <= 0
//       ) {
//         setError("Booking ID is missing or invalid in the URL.");
//         setLoading(false);
//         return;
//       }

//       try {
//         setError("");

//         // 1. Load the booking.
//         const bookingResponse = await api.get(
//           `/bookings/${Number(bookingId)}`
//         );

//         const bookingData = bookingResponse.data;

//         if (cancelled) return;

//         setBooking(bookingData);

//         if (bookingData.booking_status === "CANCELLED") {
//           setError("This booking has been cancelled.");
//           return;
//         }

//         if (bookingData.booking_status === "CONFIRMED") {
//           setError("This booking is already confirmed.");
//           return;
//         }

//         // 2. Look for the existing payment.
//         let paymentData = null;

//         try {
//           const paymentResponse = await api.get(
//             `/payments/booking/${Number(bookingId)}`
//           );

//           paymentData = paymentResponse.data;
//         } catch (err) {
//           // Only create a payment if the API says it does not exist.
//           if (err.response?.status !== 404) {
//             throw err;
//           }
//         }

//         if (cancelled) return;

//         // 3. Create a payment only if no payment exists.
//         if (!paymentData) {
//           const createResponse = await api.post("/payments/", {
//             booking_id: Number(bookingId),
//             payment_method: paymentMethod,
//             coupon_code: null,
//           });

//           paymentData = createResponse.data;
//         }

//         if (cancelled) return;

//         setPayment(paymentData);
//       } catch (err) {
//         console.error(
//           "Failed to load checkout:",
//           err.response?.data || err.message
//         );

//         if (!cancelled) {
//           setError(
//             err.response?.data?.detail ||
//               "Unable to prepare checkout. Please check the backend logs."
//           );
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     }

//     loadCheckout();

//     return () => {
//       cancelled = true;
//     };
//   }, [bookingId]);

//   async function simulatePayment(outcome) {
//     if (!payment?.id) {
//       setError("Payment ID is unavailable. Please reload checkout.");
//       return;
//     }

//     if (payment.payment_status !== "PENDING") {
//       setError(
//         `This payment has already been processed. Current status: ${payment.payment_status}`
//       );
//       return;
//     }

//     try {
//       setProcessing(true);
//       setError("");

//       const response = await api.post(
//         `/payments/${payment.id}/simulate`,
//         null,
//         {
//           params: { outcome },
//         }
//       );

//       let updatedPayment = response.data;

//       // Refresh the payment if the API supports this endpoint.
//       try {
//         const refreshResponse = await api.get(
//           `/payments/booking/${Number(bookingId)}`
//         );

//         updatedPayment = refreshResponse.data;
//       } catch {
//         // Keep the simulation response if refresh fails.
//       }

//       setPayment(updatedPayment);

//       navigate(
//         `/payment-confirmation?payment_id=${encodeURIComponent(
//           updatedPayment.id
//         )}`,
//         {
//           state: {
//             payment: updatedPayment,
//             result: response.data,
//           },
//         }
//       );
//     } catch (err) {
//       console.error(
//         "Payment simulation failed:",
//         err.response?.data || err.message
//       );

//       setError(
//         err.response?.data?.detail ||
//           "Payment simulation failed. Please check the backend logs."
//       );
//     } finally {
//       setProcessing(false);
//     }
//   }

//   if (loading) {
//     return (
//       <main className="payment-container">
//         <h1>Secure Checkout</h1>
//         <p>Preparing your payment...</p>
//       </main>
//     );
//   }

//   if (error && !payment) {
//     return (
//       <main className="payment-container">
//         <section className="payment-card">
//           <h1>Secure Checkout</h1>
//           <p className="payment-error">{error}</p>

//           <button
//             type="button"
//             onClick={() => navigate("/bookings")}
//           >
//             View My Bookings
//           </button>

//           <button
//             type="button"
//             onClick={() => window.location.reload()}
//           >
//             Try Again
//           </button>
//         </section>
//       </main>
//     );
//   }

//   const amount = Number(payment?.amount ?? booking?.total_price ?? 0);

//   return (
//     <main className="payment-container">
//       <section className="payment-card">
//         <h1>Secure Checkout</h1>
//         <p>Review your booking before continuing.</p>

//         {error && <p className="payment-error">{error}</p>}

//         <div className="payment-details">
//           <p>
//             <strong>Booking ID:</strong> {bookingId}
//           </p>

//           <p>
//             <strong>Event:</strong>{" "}
//             {booking?.event?.title ||
//               booking?.event_title ||
//               `Event #${booking?.event_id ?? "—"}`}
//           </p>

//           <p>
//             <strong>Tickets:</strong> {booking?.ticket_quantity ?? "—"}
//           </p>

//           <p>
//             <strong>Total:</strong>{" "}
//             ₹{Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}
//           </p>

//           <p>
//             <strong>Payment method:</strong>{" "}
//             {payment?.payment_method || paymentMethod}
//           </p>

//           <p>
//             <strong>Payment status:</strong>{" "}
//             {payment?.payment_status || "UNKNOWN"}
//           </p>

//           <p>
//             <strong>Booking status:</strong>{" "}
//             {booking?.booking_status || "UNKNOWN"}
//           </p>
//         </div>

//         {payment?.payment_status === "PENDING" ? (
//           <div className="payment-actions">
//             <button
//               type="button"
//               disabled={processing}
//               onClick={() => simulatePayment("success")}
//             >
//               {processing
//                 ? "Processing..."
//                 : "Simulate Successful Payment"}
//             </button>

//             <button
//               type="button"
//               disabled={processing}
//               onClick={() => simulatePayment("failure")}
//             >
//               {processing
//                 ? "Processing..."
//                 : "Simulate Failed Payment"}
//             </button>
//           </div>
//         ) : (
//           <p>
//             Payment has already been processed. Status:{" "}
//             {payment?.payment_status}
//           </p>
//         )}

//         <p className="payment-note">
//           Development mode only. No real money is charged.
//         </p>
//       </section>
//     </main>
//   );
// }


import { Navigate, useSearchParams } from "react-router-dom";

export default function PaymentCheckout() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  if (!bookingId || !/^[1-9]\d*$/.test(bookingId)) {
    return (
      <div style={{ padding: "30px", textAlign: "center" }}>
        <h2>Booking ID is missing</h2>
        <p>Please open checkout from your booking.</p>
        <a href="/bookings">Return to Bookings</a>
      </div>
    );
  }

  return (
    <Navigate
      to={`/checkout?booking_id=${encodeURIComponent(bookingId)}`}
      replace
    />
  );
}
