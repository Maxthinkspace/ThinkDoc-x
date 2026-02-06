import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Spinner,
} from "@fluentui/react-components";
import { Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { authService } from "../../../../services/auth";
import { useToast } from "../../../hooks/use-toast";
import { useLanguage } from "../../../contexts/LanguageContext";
import "./ChangePasswordModal.css";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
}) => {
  const { toast } = useToast();
  const { translations } = useLanguage();
  
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Password validation requirements
  const passwordRequirements: PasswordRequirement[] = React.useMemo(() => [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Contains a number", met: /\d/.test(newPassword) },
    { label: "Contains a lowercase letter", met: /[a-z]/.test(newPassword) },
  ], [newPassword]);

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && isPasswordValid && doPasswordsMatch && !isLoading;

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      await authService.changePassword(currentPassword, newPassword);
      
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
        variant: "success",
      });
      
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to change password. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onClose()}>
      <DialogSurface className="change-password-dialog">
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle className="change-password-title">
              <Lock size={20} />
              <span>{translations.setup?.changePassword || "Change Password"}</span>
            </DialogTitle>
            
            <DialogContent className="change-password-content">
              {error && (
                <div className="change-password-error">
                  {error}
                </div>
              )}
              
              {/* Current Password */}
              <div className="change-password-field">
                <label className="change-password-label">Current Password</label>
                <div className="change-password-input-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="change-password-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="change-password-field">
                <label className="change-password-label">New Password</label>
                <div className="change-password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="change-password-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {newPassword.length > 0 && (
                  <div className="change-password-requirements">
                    {passwordRequirements.map((req, index) => (
                      <div 
                        key={index} 
                        className={`change-password-requirement ${req.met ? 'met' : 'unmet'}`}
                      >
                        {req.met ? <Check size={14} /> : <X size={14} />}
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="change-password-field">
                <label className="change-password-label">Confirm New Password</label>
                <div className="change-password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="change-password-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !doPasswordsMatch && (
                  <div className="change-password-mismatch">
                    Passwords do not match
                  </div>
                )}
              </div>
            </DialogContent>

            <DialogActions className="change-password-actions">
              <Button 
                appearance="secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                appearance="primary"
                type="submit"
                disabled={!canSubmit}
                className="change-password-submit"
              >
                {isLoading ? (
                  <>
                    <Spinner size="tiny" />
                    <span>Changing...</span>
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};

