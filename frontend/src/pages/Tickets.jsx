
import { useEffect, useState } from "react";
import api from "../services/api";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadTickets() {
      try {
        const response = await api.get("/tickets/");

        if (!ignore) {
          setTickets(response.data);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.detail ||
              "Unable to load tickets. Please log in and try again."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <p style={styles.message}>Loading your tickets...</p>;
  }

  return (
    <main style={styles.container}>
      <h1>My Tickets</h1>
      <p style={styles.subtitle}>
        View your booking tickets and QR codes.
      </p>

      {error && <p style={styles.error}>{error}</p>}

      {!error && tickets.length === 0 && (
        <p style={styles.message}>
          No tickets found. Book an event to receive a ticket.
        </p>
      )}

      <div style={styles.grid}>
        {tickets.map((ticket) => (
          <article key={ticket.id} style={styles.card}>
            <h2>Ticket #{ticket.id}</h2>

            <p>
              <strong>Ticket code:</strong>
            </p>
            <p style={styles.code}>
              {ticket.ticket_code || "Not available"}
            </p>

            <p>
              <strong>Booking ID:</strong>{" "}
              {ticket.booking_id ?? "Not available"}
            </p>

            <p>
              <strong>Created:</strong>{" "}
              {ticket.created_at
                ? new Date(ticket.created_at).toLocaleString()
                : "Not available"}
            </p>

            {ticket.qr_code_url ? (
              <div style={styles.qrSection}>
                <img
                  src={
                    ticket.qr_code_url.startsWith("http")
                      ? ticket.qr_code_url
                      : `http://127.0.0.1:8000/${ticket.qr_code_url.replace(/^\/+/, "")}`
                  }
                  alt={`QR code for ticket ${ticket.ticket_code}`}
                  style={styles.qrImage}
                />
                <p>Show this QR code at the event entrance.</p>
              </div>
            ) : (
              <p style={styles.message}>
                QR code image is not available.
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "30px auto",
    padding: "20px",
  },
  subtitle: {
    color: "#666",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  },
  code: {
    overflowWrap: "anywhere",
    fontFamily: "monospace",
  },
  qrSection: {
    marginTop: "20px",
    textAlign: "center",
  },
  qrImage: {
    width: "180px",
    height: "180px",
    objectFit: "contain",
    maxWidth: "100%",
  },
  error: {
    color: "#b91c1c",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "6px",
  },
  message: {
    textAlign: "center",
    padding: "20px",
  },
};
