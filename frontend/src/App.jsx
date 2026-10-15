
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { AuthProvider } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Chatbot from "./components/Chatbot.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import BookingHistory from "./pages/BookingHistory.jsx";
import Tickets from "./pages/Tickets.jsx";
import Notifications from "./pages/Notifications.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import Profile from "./pages/Profile.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PaymentCheckout from "./pages/PaymentCheckout.jsx";
import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Wishlist from "./pages/Wishlist.jsx";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/events/:eventId"
            element={<EventDetails />}
          />

          {/* Protected user routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <Tickets />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking-confirmation/:bookingId"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          {/* Role-specific dashboards */}
          <Route
            path="/organizer/dashboard"
            element={
              <ProtectedRoute>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Payment routes */}
          <Route
            path="/checkout"
            element={<Checkout />}
          />

          <Route
            path="/payment-checkout"
            element={<PaymentCheckout />}
          />

          <Route
            path="/payment-confirmation"
            element={<PaymentConfirmation />}
          />
        </Routes>

        {/* Floating chatbot — available across all routes */}
        <Chatbot />

        <ToastContainer position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
