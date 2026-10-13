import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import api from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const response = await api.get("/notifications/");

      setNotifications(response.data);
    } catch (error) {
      console.error("Error loading notifications:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(
        `/notifications/${notificationId}/read`
      );

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? response.data
            : notification
        )
      );

      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to mark notification as read"
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <h1>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h2>No notifications</h2>
          <p>
            Your booking and event notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${
                notification.is_read ? "read" : "unread"
              }`}
            >
              <div className="notification-content">
                <div className="notification-title-row">
                  <h2>{notification.title}</h2>

                  {!notification.is_read && (
                    <span className="unread-badge">
                      NEW
                    </span>
                  )}
                </div>

                <p>{notification.message}</p>

                <div className="notification-footer">
                  <span>
                    Type: {notification.type}
                  </span>

                  <span>
                    {new Date(
                      notification.created_at
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notification.is_read && (
                <button
                  onClick={() =>
                    markAsRead(notification.id)
                  }
                  className="read-button"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;