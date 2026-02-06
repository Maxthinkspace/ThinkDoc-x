/**
 * ResetPassword Component
 *
 * A clean, simple UI for resetting password with token.
 *
 * Features:
 * - Token from URL/email
 * - New password input
 * - Confirm password input
 * - Submit to reset password
 * - Back to login link
 */

import * as React from "react";
import { useState, useEffect } from "react";
import "./Login.css";
import TextField from "@mui/material/TextField";
import { useToast } from "../../hooks/use-toast";
import { authService } from "../../../services/auth";

export interface ResetPasswordProps {
  token: string;
  onBack: () => void;
  onSuccess: () => void;
  useLogger?: boolean;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  token,
  onBack,
  onSuccess,
  useLogger = false,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ general?: string; password?: string; confirmPassword?: string }>({});
  const { toast } = useToast();

  /**
   * Verify token on mount
   */
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsVerifying(false);
        return;
      }

      try {
        const isValid = await authService.verifyResetToken(token);
        setIsValidToken(isValid);
      } catch (error: any) {
        if (useLogger) console.error("Token verification error:", error);
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, useLogger]);

  /**
   * Validates password strength
   */
  const validatePassword = (pwd: string) => {
    const minLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const isLongEnough = pwd.length >= 15;

    return {
      valid: isLongEnough || (minLength && hasNumber && hasLower),
      minLength,
      hasNumber,
      hasLower,
      isLongEnough,
    };
  };

  /**
   * Handles password reset
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setErrors({ password: "Password requirements not met" });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      
      if (useLogger) console.log("Password reset successful");
      toast({
        title: "Password reset",
        description: "Your password has been reset successfully. Please sign in with your new password.",
        variant: "success",
      });
      onSuccess();
    } catch (error: any) {
      if (useLogger) console.error("Reset password error:", error);
      const errorMessage = error.message || "Failed to reset password. Please try again.";
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

  if (isVerifying) {
    return (
      <div className="login-container">
        <h5 style={{
          paddingBottom: "12px",
          fontSize: "25px"
        }}>Verifying reset link...</h5>
        <p style={{ color: "#656d76", fontSize: "14px" }}>Please wait</p>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="login-container">
        <h5 style={{
          paddingBottom: "12px",
          fontSize: "25px"
        }}>Invalid or expired link</h5>
        
        <div style={{ 
          textAlign: "center", 
          color: "#656d76", 
          marginBottom: "24px",
          maxWidth: "400px"
        }}>
          <p>This password reset link is invalid or has expired.</p>
          <p style={{ marginTop: "16px", fontSize: "14px" }}>
            Please request a new password reset link.
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

  const passwordValidation = validatePassword(password);

  return (
    <div className="login-container">
      <h5 style={{
        paddingBottom: "12px",
        fontSize: "25px"
      }}>Set new password</h5>

      <p style={{ 
        textAlign: "center", 
        color: "#656d76", 
        marginBottom: "24px",
        fontSize: "14px"
      }}>
        Enter your new password below.
      </p>

      {/* Password reset form */}
      <form onSubmit={handleResetPassword} className="form">
        {errors.general && (
          <div className="login-error-message" style={{ marginBottom: "16px" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            {errors.general}
          </div>
        )}

        {/* Password field */}
        <div className="login-form-field">
          <TextField
            id="password"
            label="New password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            error={Boolean(errors.password)}
            helperText={errors.password || ""}
          />
        </div>

        {/* Password requirements */}
        {password && (
          <div style={{ fontSize: "12px", color: "#8b949e", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{passwordValidation.minLength ? "✓" : "○"}</span>
              <span>At least 8 characters</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{passwordValidation.hasNumber ? "✓" : "○"}</span>
              <span>Include a number</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{passwordValidation.hasLower ? "✓" : "○"}</span>
              <span>Include a lowercase letter</span>
            </div>
          </div>
        )}

        {/* Confirm password field */}
        <div className="login-form-field">
          <TextField
            id="confirmPassword"
            label="Confirm new password"
            type={showConfirmPassword ? "text" : "password"}
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword || ""}
          />
        </div>

        {/* Submit button */}
        <button type="submit" className="signin-button" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {/* Back to login link */}
      <div className="login-create-account" style={{ marginTop: "16px" }}>
        <button onClick={onBack} className="login-create-account-link" type="button">
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;


