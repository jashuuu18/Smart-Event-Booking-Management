import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import api from "../services/api";

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const response = await api.get("/tickets/");

      setTickets(response.data);
    } catch (error) {
      console.error("Error loading tickets:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to load tickets"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="tickets-page">
      <h1>My Tickets</h1>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <h2>No tickets found</h2>

          <p>
            Your QR tickets will appear here after
            you book an event.
          </p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => (
            <div
              className="ticket-card"
              key={ticket.id}
            >
              <div className="ticket-header">
                <h2>🎟️ SmartEvent Ticket</h2>

                <span>
                  CONFIRMED
                </span>
              </div>

              <div className="ticket-details">
                <p>
                  <strong>Ticket ID:</strong>{" "}
                  {ticket.id}
                </p>

                <p>
                  <strong>Booking ID:</strong>{" "}
                  {ticket.booking_id}
                </p>

                <p>
                  <strong>Ticket Code:</strong>{" "}
                  {ticket.ticket_code}
                </p>

                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(
                    ticket.created_at
                  ).toLocaleString()}
                </p>
              </div>

              {ticket.qr_code_url && (
                <div className="qr-section">
                  <h3>Scan QR Code</h3>

                  <img
                    src={`http://127.0.0.1:8000${ticket.qr_code_url}`}
                    alt="Ticket QR Code"
                    className="qr-code"
                  />
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tickets;