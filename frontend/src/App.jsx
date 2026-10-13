import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { AuthProvider } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import BookingHistory from "./pages/BookingHistory.jsx";
import Tickets from "./pages/Tickets.jsx";
import Notifications from "./pages/Notifications.jsx";
import BookingConfirmation from "./pages/BookingConfirmation.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Profile from "./pages/Profile.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PaymentCheckout from "./pages/PaymentCheckout.jsx";

import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>

        <Navbar />

        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/events/:eventId"
            element={<EventDetails />}
          />

          <Route
            path="/organizer/dashboard"
            element={
            <ProtectedRoute>
             <OrganizerDashboard />
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
            path="/admin/dashboard"
            element={
           <ProtectedRoute>
           <AdminDashboard />
           </ProtectedRoute>
          }
          />
          <Route path="/checkout" element={<Checkout />} />

          <Route
            path="/payment-checkout"
            element={<PaymentCheckout />}
          />

          
          
          
          <Route
            path="/payment-confirmation"
            element={<PaymentConfirmation />}
          />

        </Routes>

        <ToastContainer position="top-right" />

      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;