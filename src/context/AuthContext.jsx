
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * Check whether a user is already logged in
   * when the application starts.
   */
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/users/me")
      .then((response) => {
        setUser(response.data);
      })
      .catch((error) => {
        console.error(
          "Authentication check failed:",
          error
        );

        localStorage.removeItem("access_token");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /*
   * Login
   */
  const login = async (email, password) => {
  const formData = new URLSearchParams();

  formData.append("username", email);
  formData.append("password", password);

  const response = await api.post(
    "/auth/login",
    formData,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const accessToken = response.data.access_token;

  localStorage.setItem("access_token", accessToken);

  const profileResponse = await api.get("/users/me");

  setUser(profileResponse.data);

  return response.data;
};

  /*
   * Register
   */
  const register = async (
    username,
    email,
    password
  ) => {
    const response = await api.post(
      "/auth/register",
      {
        username: username,
        email: email,
        password: password,
      }
    );

    return response.data;
  };

  /*
   * Logout
   */
  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

