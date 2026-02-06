/**
 * CreateAccount Component
 *
 * A simple account creation UI for ThinkDoc with backend API authentication.
 *
 * Features:
 * - First name, last name, email, password fields
 * - Email/password signup only
 * - Password strength requirements
 * - Real-time validation
 */

import React, { useState, useCallback } from "react";
import "./Login.css";
import TextField from "@mui/material/TextField";
import { useToast } from "../../hooks/use-toast";
import { backendApi } from "../../../services/api";

export interface CreateAccountProps {
  onBack: () => void;
  onAccountCreated: (email: string) => void;
  onForgotPassword: () => void;
  useLogger?: boolean;
}

export const CreateAccount: React.FC<CreateAccountProps> = ({
  onBack,
  onAccountCreated,
  onForgotPassword: _onForgotPassword,
  useLogger = false,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [touched, setTouched] = useState<Record<string, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
  });

  /**
   * Validates password strength
   * Must meet ONE of these:
   * - 15+ characters (any composition), OR
   * - 8+ characters with a number AND a lowercase letter
   */
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLower = /[a-z]/.test(password);
    const isLongEnough = password.length >= 15;

    return {
      valid: isLongEnough || (minLength && hasNumber && hasLower),
      minLength,
      hasNumber,
      hasLower,
      isLongEnough,
    };
  };

  const passwordValidation = validatePassword(formData.password);

  // Removed OAuth signup - use email/password only

  /**
   * Handles form field changes
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate live if field has been touched
    if (touched[field]) {
      validateAndSetFieldError(field, value);
    } else {
      // Clear error while typing before touch
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const validateAndSetFieldError = (field: string, value: string) => {
    let message = "";
    if (field === "firstName" && !value.trim()) message = "First name is required";
    if (field === "lastName" && !value.trim()) message = "Last name is required";
    if (field === "email") {
      if (!value.trim()) message = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = "Enter a valid email";
    }
    if (field === "password") {
      if (!passwordValidation.valid) message = "Password requirements not met";
    }

    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Run validation on blur with current value
    // @ts-ignore - dynamic key access
    validateAndSetFieldError(field, formData[field as keyof typeof formData] as string);
  };

  /**
   * Handles account creation with email/password
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!passwordValidation.valid) newErrors.password = "Password requirements not met";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ firstName: true, lastName: true, email: true, password: true });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Create account via backend API
      const name = `${formData.firstName} ${formData.lastName}`;
      const response = await backendApi.register({
        email: formData.email,
        password: formData.password,
        name: name,
      });

      if (!response.success || response.error) {
        if (useLogger) console.error("Sign up error:", response.error);
        
        // Handle 409 status code - User already exists
        if (response.error?.statusCode === 409) {
          toast({
            title: "User already exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "error",
          });
          setIsLoading(false);
          // Switch to login screen after a short delay to allow toast to be visible
          setTimeout(() => {
            onBack();
          }, 1500);
          return;
        }
        
        toast({
          title: "Sign up failed",
          description: response.error?.message || "Failed to create account",
          variant: "error",
        });
        setIsLoading(false);
        return;
      }

      // Token and user info are already stored by the register method
      if (useLogger) console.log("Account created successfully", response.data);
      toast({
        title: "Account created",
        description: "Your account has been created successfully!",
        variant: "success",
      });
      
      // Notify parent component and return to login screen
      onAccountCreated(formData.email);
      onBack();
    } catch (error: any) {
      if (useLogger) console.error("Unexpected sign up error:", error);
      toast({
        title: "Unexpected error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="login-card">
        <h2 className="login-welcome">Create your account</h2>
        <p className="login-subtitle">Join ThinkDoc to start creating intelligent documents</p>

        {/* General error message */}
        {/* General/backend errors use toast only; inline is for validation */}

        {/* OAuth removed - using email/password signup only */}

        <form onSubmit={handleSignUp}>
          {/* First Name and Last Name Row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="login-form-field">
              <TextField
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
                disabled={isLoading}
                type="text"
                label="First name"
                variant="outlined"
                error={Boolean(errors.firstName)}
                helperText={errors.firstName || ""}
              />
            </div>

            {/* Password field */}
            <div className="login-form-field">
              <TextField
                id="lastName"
                label="Last name"
                type="text"
                variant="outlined"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                disabled={isLoading}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName || ""}
              />
            </div>
          </div>

          {/* Email */}
          <div className="login-form-field">
            <TextField
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              disabled={isLoading}
              type="email"
              label="Email address"
              variant="outlined"
              error={Boolean(errors.email)}
              helperText={errors.email || ""}
            />
          </div>

          <div className="login-form-field">
            <TextField
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              disabled={isLoading}
              error={Boolean(errors.password)}
              helperText={errors.password || ""}
            />
          </div>
          {/* Password requirements */}
          <div style={{ fontSize: "12px", color: "#8b949e", paddingBottom: "10px" }}>
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

          {/* Password error message handled by TextField helperText above */}
          {/* </div> */}

          {/* Create account button */}
          <button
            type="submit"
            className="signin-button"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Sign in link */}
        <div className="login-create-account" style={{ marginTop: "16px" }}>
          Already have an account?{" "}
          <button onClick={onBack} className="login-create-account-link">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;
