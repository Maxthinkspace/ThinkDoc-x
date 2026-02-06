/**
 * Payment Button Component
 * 
 * Reusable button component for payment actions.
 * Handles loading states and hover effects.
 * 
 * Separation of Concerns:
 * - Isolated button styling and behavior
 * - Reusable across payment-related components
 * - Easy to customize or extend
 */

import * as React from 'react';
import { subscriptionButtonStyles } from '../styles/subscriptionStyles';

export interface PaymentButtonProps {
  onClick: () => void;
  isLoading: boolean;
  children?: React.ReactNode;
}

/**
 * PaymentButton Component
 * 
 * @param props - Component props
 * @returns JSX element with payment button
 */
export const PaymentButton: React.FC<PaymentButtonProps> = ({
  onClick,
  isLoading,
  children = 'Make Payment',
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const buttonStyle: React.CSSProperties = {
    ...subscriptionButtonStyles.base,
    ...(isLoading && subscriptionButtonStyles.disabled),
    ...(isHovered && !isLoading && { backgroundColor: subscriptionButtonStyles.hover.backgroundColor }),
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-busy={isLoading}
      aria-label={isLoading ? 'Opening payment dialog' : 'Make payment'}
    >
      {isLoading ? 'Opening Payment...' : children}
    </button>
  );
};
