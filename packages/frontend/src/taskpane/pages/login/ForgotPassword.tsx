/**
 * ForgotPassword Component
 *
 * A clean, simple UI for requesting password reset.
 *
 * Features:
 * - Email input
 * - Submit to request password reset
 * - Back to login link
 */

import * as React from "react";
import { useState } from "react";
import "./Login.css";
import TextField from "@mui/material/TextField";
import { useToast } from "../../hooks/use-toast";
import { authService } from "../../../services/auth";

export interface ForgotPasswordProps {
  onBack: () => void;
  useLogger?: boolean;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBack,
  useLogger = false,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ general?: string }>({});
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  /**
   * Handles password reset request
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim()) {
      setErrors({ general: "Please enter your email address" });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrors({ general: "Please enter a valid email address" });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await authService.forgotPassword(email.trim());
      
      if (useLogger) console.log("Password reset email sent");
      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "If an account with that email exists, a password reset link has been sent.",
        variant: "success",
      });
    } catch (error: any) {
      if (useLogger) console.error("Forgot password error:", error);
      const errorMessage = error.message || "Failed to send reset email. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="login-container">
        <h5 style={{
          paddingBottom: "12px",
          fontSize: "25px"
        }}>Check your email</h5>
        
        <div style={{ 
          textAlign: "center", 
          color: "#656d76", 
          marginBottom: "24px",
          maxWidth: "400px"
        }}>
          <p>We've sent a password reset link to:</p>
          <p style={{ fontWeight: 600, color: "#24292f", marginTop: "8px" }}>{email}</p>
          <p style={{ marginTop: "16px", fontSize: "14px" }}>
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>
          <p style={{ marginTop: "16px", fontSize: "14px" }}>
            If you don't see the email, check your spam folder.
          </p>
        </div>

        <button 
          onClick={onBack} 
          className="signin-button" 
          type="button"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h5 style={{
        paddingBottom: "12px",
        fontSize: "25px"
      }}>Reset your password</h5>

      <p style={{ 
        textAlign: "center", 
        color: "#656d76", 
        marginBottom: "24px",
        fontSize: "14px"
      }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {/* Email form */}
      <form onSubmit={handleForgotPassword} className="form">
        {/* Email field */}
        <div className="login-form-field">
          <TextField
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            type="email"
            label="Email address"
            variant="outlined"
            autoFocus
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

        {/* Submit button */}
        <button type="submit" className="signin-button" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {/* Back to login link */}
      <div className="login-create-account" style={{ marginTop: "16px" }}>
        Remember your password?{" "}
        <button onClick={onBack} className="login-create-account-link" type="button">
          Sign in
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;


