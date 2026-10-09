import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext.jsx";

function Register() {
  const { register } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.username.length < 3) {
      toast.error(
        "Username must contain at least 3 characters"
      );
      return;
    }

    if (form.password.length < 6) {
      toast.error(
        "Password must contain at least 6 characters"
      );
      return;
    }

    try {
      setLoading(true);

      await register(
        form.username,
        form.email,
        form.password
      );

      toast.success(
        "Registration successful!"
      );

      navigate("/login");

    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.detail ||
        "Registration failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h1>Create Account</h1>

        <form onSubmit={handleSubmit}>

          <label>Username</label>

          <input
            type="text"
            name="username"
            placeholder="Enter username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label>Email</label>

          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Register"}
          </button>

        </form>

        <p>
          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Register;