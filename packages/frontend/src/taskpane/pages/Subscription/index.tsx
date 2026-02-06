/**
 * Subscription Page Component
 * 
 * Main component for displaying subscription screen when user subscription is inactive or expired.
 * 
 * Architecture:
 * - Uses custom hook (usePaymentDialog) for dialog handling
 * - Uses SubscriptionMessage component for content display
 * - Uses PaymentButton component for action button
 * - Styles extracted to separate file
 * 
 * Separation of Concerns:
 * - Main component only handles composition and state management
 * - Dialog logic isolated in custom hook
 * - Presentation components are reusable
 * - Styles are centralized
 * 
 * @module Subscription
 */

import * as React from 'react';
import { usePaymentDialog } from './hooks/usePaymentDialog';
import { SubscriptionMessage } from './components/SubscriptionMessage';
import { PaymentButton } from './components/PaymentButton';
import { subscriptionPageStyles, subscriptionPageContainerStyles } from './styles/subscriptionStyles';

export interface SubscriptionPageProps {
  /** Callback function executed when payment dialog closes */
  onPaymentComplete: () => void;
  /** If true, shows message for new account creation flow */
  isNewAccount?: boolean;
  /** If true, shows "Restart Subscription" button instead of "Subscribe" */
  isRestartSubscription?: boolean;
}

/**
 * SubscriptionPage Component
 * 
 * Displays subscription screen with contextual messaging and payment button.
 * Handles payment dialog opening and completion callbacks.
 * 
 * @param props - Component props
 * @returns JSX element with subscription page
 */
export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  onPaymentComplete,
  isNewAccount = false,
  isRestartSubscription = false,
}) => {
  const { isOpening, openPaymentDialog } = usePaymentDialog();

  /**
   * Handles payment button click
   * Opens payment dialog and calls onComplete when dialog closes
   */
  const handleMakePayment = React.useCallback(() => {
    openPaymentDialog(onPaymentComplete);
  }, [openPaymentDialog, onPaymentComplete]);

  return (
    <div style={subscriptionPageStyles}>
      <div style={subscriptionPageContainerStyles}>
        <SubscriptionMessage isNewAccount={isNewAccount} />
        
        <PaymentButton
          onClick={handleMakePayment}
          isLoading={isOpening}
        >
          {isRestartSubscription ? 'Restart Subscription' : 'Subscribe'}
        </PaymentButton>
      </div>
    </div>
  );
};

// Export with old name for backward compatibility during migration
export const PaymentPage = SubscriptionPage;
export default SubscriptionPage;
