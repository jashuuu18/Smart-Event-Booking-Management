
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { toast } from "react-toastify";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";


const STATUS_COLORS = {
  UPCOMING: "#3b82f6",
  ONGOING: "#22c55e",
  COMPLETED: "#64748b",
  CANCELLED: "#ef4444",
};


function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}


function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}


function AdminDashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [
        dashboardResponse,
        usersResponse,
        eventsResponse,
        bookingsResponse,
      ] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/users"),
        api.get("/admin/events"),
        api.get("/admin/recent-bookings"),
      ]);

      setDashboard(dashboardResponse.data);
      setUsers(usersResponse.data);
      setEvents(eventsResponse.data);
      setRecentBookings(bookingsResponse.data);
    } catch (error) {
      console.error("Admin dashboard error:", error);

      toast.error(
        error.response?.data?.detail ||
          "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [user, loadDashboard]);

  async function handleRoleChange(userId, newRole) {
    const targetUser = users.find(
      (item) => item.id === userId
    );

    if (!targetUser || targetUser.role === newRole) {
      return;
    }

    if (
      userId === user?.id &&
      newRole !== "ADMIN"
    ) {
      toast.error(
        "You cannot remove your own ADMIN role."
      );
      return;
    }

    setUpdatingUserId(userId);

    try {
      await api.put(
        `/admin/users/${userId}/role`,
        null,
        {
          params: {
            new_role: newRole,
          },
        }
      );

      toast.success("User role updated successfully.");
      await loadDashboard();
    } catch (error) {
      console.error("Role update error:", error);

      toast.error(
        error.response?.data?.detail ||
          "Unable to update user role."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeleteEvent(eventId, eventTitle) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${eventTitle}"? ` +
        "Associated bookings and tickets will also be deleted."
    );

    if (!confirmed) return;

    setDeletingEventId(eventId);

    try {
      await api.delete(`/admin/events/${eventId}`);

      toast.success("Event deleted successfully.");
      await loadDashboard();
    } catch (error) {
      console.error("Event deletion error:", error);

      toast.error(
        error.response?.data?.detail ||
          "Unable to delete event."
      );
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleExportBookings() {
    setExporting(true);

    try {
      const response = await api.get(
        "/admin/export/bookings",
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(
        response.data
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = "smartevent_bookings.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Booking report downloaded.");
    } catch (error) {
      console.error("CSV export error:", error);

      toast.error("Unable to export bookings.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <p className="admin-message">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="admin-dashboard">
        <h2>Access Denied</h2>
        <p>
          Only administrators can access this dashboard.
        </p>
      </div>
    );
  }

  const eventStatusData = dashboard
    ? [
        {
          name: "Upcoming",
          value: dashboard.upcoming_events || 0,
          status: "UPCOMING",
        },
        {
          name: "Ongoing",
          value: dashboard.ongoing_events || 0,
          status: "ONGOING",
        },
        {
          name: "Completed",
          value: dashboard.completed_events || 0,
          status: "COMPLETED",
        },
        {
          name: "Cancelled",
          value: dashboard.cancelled_events || 0,
          status: "CANCELLED",
        },
      ]
    : [];

  const bookingChartData = dashboard
    ? [
        {
          name: "Bookings",
          Active: dashboard.active_bookings || 0,
          Cancelled: dashboard.cancelled_bookings || 0,
        },
      ]
    : [];

  const revenueChartData = [
    {
      name: "Booking Revenue",
      Revenue: Number(dashboard?.total_revenue || 0),
    },
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Manage users, events, bookings, and platform
            analytics.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            Refresh Data
          </button>

          <button
            type="button"
            className="admin-export-button"
            onClick={handleExportBookings}
            disabled={exporting}
          >
            {exporting
              ? "Exporting..."
              : "Export Bookings CSV"}
          </button>
        </div>
      </header>

      {/* DASHBOARD STATISTICS */}

      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Users</h3>
          <p>{dashboard?.total_users ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Organizers</h3>
          <p>{dashboard?.total_organizers ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Customers</h3>
          <p>{dashboard?.total_customers ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Total Events</h3>
          <p>{dashboard?.total_events ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Total Bookings</h3>
          <p>{dashboard?.total_bookings ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Tickets Sold</h3>
          <p>{dashboard?.total_tickets_sold ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Active Bookings</h3>
          <p>{dashboard?.active_bookings ?? 0}</p>
        </div>

        <div className="admin-stat-card">
          <h3>Cancelled Bookings</h3>
          <p>{dashboard?.cancelled_bookings ?? 0}</p>
        </div>

        <div className="admin-stat-card admin-revenue-card">
          <h3>Booking Revenue</h3>
          <p>
            {formatCurrency(dashboard?.total_revenue)}
          </p>
        </div>
      </section>

      {/* EVENT STATUS AND BOOKING CHARTS */}

      <section className="admin-charts-grid">
        <div className="admin-panel">
          <h2>Event Status Overview</h2>

          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label
                >
                  {eventStatusData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={
                        STATUS_COLORS[entry.status]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Booking Overview</h2>

          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingChartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />

                <Tooltip />
                <Legend />

                <Bar
                  dataKey="Active"
                  fill="#22c55e"
                  radius={[5, 5, 0, 0]}
                />

                <Bar
                  dataKey="Cancelled"
                  fill="#ef4444"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-panel admin-revenue-panel">
          <h2>Total Booking Revenue</h2>

          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" hide />
                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    formatCurrency(value)
                  }
                />

                <Bar
                  dataKey="Revenue"
                  fill="#8b5cf6"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* USER MANAGEMENT */}

      <section className="admin-panel admin-table-panel">
        <h2>User Management</h2>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Update Role</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.username}</td>
                    <td>{item.email}</td>

                    <td>
                      <span
                        className={`admin-role-badge admin-role-${(
                          item.role || "USER"
                        ).toLowerCase()}`}
                      >
                        {item.role}
                      </span>
                    </td>

                    <td>{formatDate(item.created_at)}</td>

                    <td>
                      <select
                        value={item.role}
                        disabled={
                          updatingUserId === item.id ||
                          item.id === user?.id
                        }
                        onChange={(event) =>
                          handleRoleChange(
                            item.id,
                            event.target.value
                          )
                        }
                        aria-label={`Change role for ${item.username}`}
                      >
                        <option value="USER">USER</option>
                        <option value="ORGANIZER">
                          ORGANIZER
                        </option>
                        <option value="ADMIN">ADMIN</option>
                      </select>

                      {updatingUserId === item.id && (
                        <span className="admin-inline-loading">
                          Updating...
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* EVENT MANAGEMENT */}

      <section className="admin-panel admin-table-panel">
        <h2>Event Management</h2>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Event</th>
                <th>Category</th>
                <th>Location</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Ticket Price</th>
                <th>Available</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="10" className="admin-empty">
                    No events found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.id}</td>
                    <td>{event.title}</td>
                    <td>{event.category}</td>
                    <td>{event.location}</td>
                    <td>{formatDate(event.event_date)}</td>
                    <td>
                      {formatDate(event.event_end_date)}
                    </td>
                    <td>
                      {formatCurrency(event.ticket_price)}
                    </td>
                    <td>{event.available_tickets}</td>

                    <td>
                      <span
                        className="admin-status-badge"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[
                              event.event_status
                            ] || "#64748b",
                        }}
                      >
                        {event.event_status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="admin-delete-button"
                        disabled={
                          deletingEventId === event.id
                        }
                        onClick={() =>
                          handleDeleteEvent(
                            event.id,
                            event.title
                          )
                        }
                      >
                        {deletingEventId === event.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECENT BOOKINGS */}

      <section className="admin-panel admin-table-panel">
        <h2>Recent Bookings</h2>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Total Price</th>
                <th>Status</th>
                <th>Booking Date</th>
              </tr>
            </thead>

            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-empty">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr key={booking.booking_id}>
                    <td>{booking.booking_id}</td>
                    <td>{booking.customer_name}</td>
                    <td>{booking.customer_email || "—"}</td>
                    <td>{booking.event_title}</td>
                    <td>{booking.ticket_quantity}</td>
                    <td>
                      {formatCurrency(booking.total_price)}
                    </td>
                    <td>
                      <span className="admin-status-badge admin-booking-status">
                        {booking.booking_status}
                      </span>
                    </td>
                    <td>{formatDate(booking.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
