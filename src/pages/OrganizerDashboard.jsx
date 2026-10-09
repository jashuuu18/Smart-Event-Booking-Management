import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function OrganizerDashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/organizer/dashboard");

        setDashboard(response.data);
      } catch (err) {
        console.error(
          "Failed to load organizer dashboard:",
          err
        );

        if (err.response?.status === 403) {
          setError(
            "You do not have permission to access this dashboard."
          );
        } else {
          setError(
            "Failed to load organizer dashboard."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "ORGANIZER") {
      fetchDashboard();
    } else {
      setLoading(false);
      setError("Organizer access required.");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-page">
          <p>Loading organizer dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          {error}
        </div>

        <Link to="/" className="btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const chartData = dashboard.events.map((event) => ({
    name: event.event_title,
    sold: event.tickets_sold,
    remaining: event.remaining_tickets,
    bookings: event.booking_count,
    revenue: event.revenue
  }));

  const ticketData = dashboard.events.map((event) => ({
    name: event.event_title,
    value: event.tickets_sold
  }));

  return (
    <div className="page-container organizer-dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Organizer Dashboard</h1>

          <p>
            Welcome, {user?.username || "Organizer"}
          </p>
        </div>

        <Link
          to="/organizer/events"
          className="btn-primary"
        >
          Manage Events
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-cards">

        <div className="dashboard-card">
          <div className="card-icon">
            📅
          </div>

          <div>
            <h3>Total Events</h3>

            <p>
              {dashboard.total_events}
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            🎟️
          </div>

          <div>
            <h3>Tickets Sold</h3>

            <p>
              {dashboard.total_tickets_sold}
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            🎫
          </div>

          <div>
            <h3>Remaining Tickets</h3>

            <p>
              {dashboard.total_remaining_tickets}
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            📋
          </div>

          <div>
            <h3>Total Bookings</h3>

            <p>
              {dashboard.total_bookings}
            </p>
          </div>
        </div>

        <div className="dashboard-card revenue-card">
          <div className="card-icon">
            💰
          </div>

          <div>
            <h3>Total Revenue</h3>

            <p>
              ₹{Number(
                dashboard.total_revenue
              ).toFixed(2)}
            </p>
          </div>
        </div>

      </div>

      {/* Charts */}
      {dashboard.events.length > 0 && (
        <div className="charts-grid">

          {/* Tickets Chart */}
          <div className="chart-card">

            <h2>
              Tickets Sold vs Remaining
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="sold"
                  name="Tickets Sold"
                />

                <Bar
                  dataKey="remaining"
                  name="Remaining Tickets"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

          {/* Revenue Chart */}
          <div className="chart-card">

            <h2>
              Revenue per Event
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />

                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    `₹${Number(value).toFixed(2)}`
                  }
                />

                <Legend />

                <Bar
                  dataKey="revenue"
                  name="Revenue"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

          {/* Booking Chart */}
          <div className="chart-card">

            <h2>
              Bookings per Event
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <BarChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="bookings"
                  name="Bookings"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

          {/* Ticket Distribution */}
          <div className="chart-card">

            <h2>
              Ticket Sales Distribution
            </h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <PieChart>

                <Pie
                  data={ticketData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {ticketData.map(
                    (_, index) => (
                      <Cell
                        key={`cell-${index}`}
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </div>
      )}

      {/* Event Analytics Table */}
      <div className="dashboard-section">

        <div className="section-header">
          <h2>
            Event Analytics
          </h2>
        </div>

        {dashboard.events.length === 0 ? (
          <div className="empty-state">

            <p>
              You have not created any events yet.
            </p>

            <Link
              to="/organizer/events/create"
              className="btn-primary"
            >
              Create Your First Event
            </Link>

          </div>
        ) : (
          <div className="table-wrapper">

            <table className="analytics-table">

              <thead>
                <tr>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Total Tickets</th>
                  <th>Sold</th>
                  <th>Remaining</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                </tr>
              </thead>

              <tbody>

                {dashboard.events.map(
                  (event) => (
                    <tr
                      key={event.event_id}
                    >

                      <td>
                        <strong>
                          {event.event_title}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${event.event_status.toLowerCase()}`}
                        >
                          {event.event_status}
                        </span>
                      </td>

                      <td>
                        {event.total_tickets}
                      </td>

                      <td>
                        {event.tickets_sold}
                      </td>

                      <td>
                        {event.remaining_tickets}
                      </td>

                      <td>
                        {event.booking_count}
                      </td>

                      <td>
                        ₹{Number(
                          event.revenue
                        ).toFixed(2)}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default OrganizerDashboard;