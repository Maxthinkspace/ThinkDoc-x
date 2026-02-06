/**
 * Login Component
 *
 * A clean, simple login UI for ThinkDoc with backend API authentication.
 *
 * Features:
 * - Email/password login
 * - Password visibility toggle
 * - Forgot password link
 * - Create account link
 */

import * as React from "react";
import { useState } from "react";
import "./Login.css";
import TextField from "@mui/material/TextField";
import { useToast } from "../../hooks/use-toast";
import { backendApi } from "../../../services/api";

export interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  useLogger?: boolean;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onCreateAccount,
  onForgotPassword,
  useLogger = false,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ general?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  /**
   * Handles email/password login
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim() || !password.trim()) {
      setErrors({ general: "Please fill out all fields" });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await backendApi.login({
        email: email.trim(),
        password: password,
      });

      if (response.data) {
        if (useLogger) console.log("Login successful", response.data.user);
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.data.user.name}!`,
          variant: "success",
        });
        onLoginSuccess(response.data.user);
      }
    } catch (error: any) {
      if (useLogger) console.error("Login error:", error);
      const errorMessage = error.message || "Your email or password is incorrect.";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "error",
      });
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-container">


      <h5 style={{
        paddingBottom: "12px",
        fontSize: "25px"
      }}>Login to your account</h5>

      {/* Email/Password form */}
      <form onSubmit={handleEmailLogin} className="form">
        {/* Email/Username field */}
        <div className="login-form-field">
          <TextField
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            type="email"
            label="Email address"
            variant="outlined"
          />

          {errors.general && (
            <div className="login-error-message">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
              </svg>
              {errors.general}
            </div>
          )}
        </div>

        {/* Password field */}
        <div className="login-form-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label htmlFor="password" className="login-label">Password</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="login-forgot-password"
            >
              Forgot password?
            </button>
          </div>
          <TextField
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
           {errors.general && (
            <div className="login-error-message">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
              </svg>
              {errors.general}
            </div>
          )}
        </div>

        {/* Inline general error between fields and button */}
        {/* Sign in button */}
        <button type="submit" className="signin-button" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Create account link */}
      <div className="login-create-account">
        Dont't have an account?
        <button onClick={onCreateAccount} className="login-create-account-link" type="button">
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Login;
