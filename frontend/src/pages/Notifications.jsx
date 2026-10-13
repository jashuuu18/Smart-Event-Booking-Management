
import { useEffect, useState } from "react";
import api from "../services/api";

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState(null);

  const loadNotifications = async () => {
    try {
      setError("");

      const [notificationResponse, countResponse] =
        await Promise.all([
          api.get("/notifications/"),
          api.get("/notifications/unread-count"),
        ]);

      setNotifications(notificationResponse.data);
      setUnreadCount(countResponse.data.unread_count ?? 0);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load notifications. Please log in and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      setMarkingId(notificationId);
      setError("");

      await api.put(`/notifications/${notificationId}/read`);

      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to mark this notification as read."
      );
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return <p style={styles.message}>Loading notifications...</p>;
  }

  return (
    <main style={styles.container}>
      <h1>My Notifications</h1>

      <div style={styles.countCard}>
        <span>Unread notifications</span>
        <strong style={styles.count}>{unreadCount}</strong>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {!error && notifications.length === 0 && (
        <p style={styles.message}>You have no notifications.</p>
      )}

      <div style={styles.list}>
        {notifications.map((notification) => (
          <article
            key={notification.id}
            style={{
              ...styles.card,
              ...(notification.is_read ? {} : styles.unread),
            }}
          >
            <div style={styles.cardHeader}>
              <h2>{notification.title}</h2>

              <span
                style={{
                  ...styles.badge,
                  background: notification.is_read
                    ? "#e5e7eb"
                    : "#dbeafe",
                }}
              >
                {notification.is_read ? "Read" : "Unread"}
              </span>
            </div>

            <p>{notification.message}</p>

            <p style={styles.meta}>
              Type: {notification.type || "General"}
            </p>

            {notification.created_at && (
              <p style={styles.meta}>
                {new Date(notification.created_at).toLocaleString()}
              </p>
            )}

            {!notification.is_read && (
              <button
                type="button"
                disabled={markingId === notification.id}
                onClick={() => markAsRead(notification.id)}
                style={styles.button}
              >
                {markingId === notification.id
                  ? "Updating..."
                  : "Mark as read"}
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "20px",
  },
  countCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px",
    marginBottom: "24px",
    borderRadius: "10px",
    background: "#eff6ff",
  },
  count: {
    fontSize: "24px",
  },
  list: {
    display: "grid",
    gap: "16px",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    background: "#fff",
  },
  unread: {
    borderLeft: "5px solid #2563eb",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
  },
  meta: {
    color: "#666",
    fontSize: "13px",
  },
  button: {
    padding: "9px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  error: {
    color: "#b91c1c",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "6px",
  },
  message: {
    textAlign: "center",
    padding: "30px",
  },
};
