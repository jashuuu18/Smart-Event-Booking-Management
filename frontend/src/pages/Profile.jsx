
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await api.get("/users/me");

        if (!cancelled) {
          setProfile(response.data);
          setForm({
            username: response.data.username || "",
            email: response.data.email || "",
          });
        }
      } catch (err) {
        console.error("PROFILE ERROR:", err);

        if (!cancelled) {
          if (
            err.response?.status === 401 ||
            err.response?.status === 403
          ) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("token");
            navigate("/login");
          } else {
            setError(
              err.response?.data?.detail ||
                "Unable to load your profile."
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCancel() {
    setForm({
      username: profile?.username || "",
      email: profile?.email || "",
    });

    setEditing(false);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const username = form.username.trim();
    const email = form.email.trim();

    if (username.length < 3 || username.length > 50) {
      toast.error("Username must contain 3 to 50 characters.");
      return;
    }

    if (!email) {
      toast.error("Email is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await api.patch("/users/me", {
        username,
        email,
      });

      setProfile(response.data);

      setForm({
        username: response.data.username || "",
        email: response.data.email || "",
      });

      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("PROFILE UPDATE ERROR:", err);

      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Could not update your profile.";

      setError(
        typeof message === "string"
          ? message
          : JSON.stringify(message)
      );

      toast.error(
        typeof message === "string"
          ? message
          : "Please check your profile details."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <h1>My Profile</h1>
        <p role="alert">
          {error || "Profile information is unavailable."}
        </p>

        <button onClick={() => navigate("/")}>
          Back to Home
        </button>
      </main>
    );
  }

  const createdAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : "Not available";

  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {(profile.username || profile.email || "U")
            .charAt(0)
            .toUpperCase()}
        </div>

        <h1>My Profile</h1>

        <p className="profile-subtitle">
          Manage your SmartEvent account information.
        </p>

        {!editing ? (
          <>
            <div className="profile-details">
              <div className="profile-detail-row">
                <span>Username</span>
                <strong>{profile.username}</strong>
              </div>

              <div className="profile-detail-row">
                <span>Email</span>
                <strong>{profile.email}</strong>
              </div>

              <div className="profile-detail-row">
                <span>User ID</span>
                <strong>{profile.id}</strong>
              </div>

              <div className="profile-detail-row">
                <span>Member since</span>
                <strong>{createdAt}</strong>
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>

              <button
                type="button"
                className="profile-secondary-button"
                onClick={() => navigate("/bookings")}
              >
                My Bookings
              </button>

              <button
                type="button"
                className="profile-secondary-button"
                onClick={() => navigate("/")}
              >
                Back to Home
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="profile-form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                minLength={3}
                maxLength={50}
                value={form.username}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div className="profile-form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            {error && (
              <p className="profile-error" role="alert">
                {error}
              </p>
            )}

            <div className="profile-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="profile-secondary-button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
