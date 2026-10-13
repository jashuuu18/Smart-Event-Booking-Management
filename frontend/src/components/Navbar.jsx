
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          SmartEvent
        </Link>

        <div className="navbar-links">
          <Link to="/">Home</Link>

          {user ? (
            <>
              <Link to="/profile">Profile</Link>
              <Link to="/bookings">My Bookings</Link>
              <Link to="/tickets">My Tickets</Link>
              <Link to="/notifications">Notifications</Link>
              <Link to="/payment-checkout?booking_id=">
                Payment Checkout
              </Link>

              {user.role === "ORGANIZER" && (
                <Link to="/organizer/dashboard">
                  Organizer Dashboard
                </Link>
              )}

              {user.role === "ADMIN" && (
                <Link to="/admin/dashboard">
                  Admin Dashboard
                </Link>
              )}

              <button
                type="button"
                className="navbar-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;