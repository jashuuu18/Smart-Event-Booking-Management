import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import api from "../services/api";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/me");

      setProfile(response.data);
    } catch (error) {
      console.error("Error loading profile:", error);

      toast.error(
        error.response?.data?.detail ||
        "Unable to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="empty-state">
          <h2>Profile not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">

      <div className="profile-card">

        <div className="profile-avatar">
          {profile.username
            ? profile.username.charAt(0).toUpperCase()
            : "U"}
        </div>

        <h1>My Profile</h1>

        <p className="profile-subtitle">
          Your SmartEvent account information
        </p>

        <div className="profile-details">

          <div className="profile-row">
            <span>Username</span>
            <strong>{profile.username}</strong>
          </div>

          <div className="profile-row">
            <span>Email</span>
            <strong>{profile.email}</strong>
          </div>

          <div className="profile-row">
            <span>User ID</span>
            <strong>#{profile.id}</strong>
          </div>

          <div className="profile-row">
            <span>Account Created</span>
            <strong>
              {new Date(
                profile.created_at
              ).toLocaleString()}
            </strong>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Profile;