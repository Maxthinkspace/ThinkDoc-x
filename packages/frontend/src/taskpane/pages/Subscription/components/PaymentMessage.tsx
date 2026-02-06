/**
 * Payment Message Component
 * 
 * Displays contextual messages for payment scenarios.
 * Supports different message types (new account vs expired subscription).
 * 
 * Separation of Concerns:
 * - Isolated presentation logic
 * - Reusable message component
 * - Easy to extend with new message types
 */

import * as React from 'react';
import { paymentMessageStyles } from '../styles/paymentStyles';

export interface PaymentMessageProps {
  isNewAccount: boolean;
}

/**
 * Payment message content configuration
 */
const MESSAGE_CONFIG = {
  newAccount: {
    title: 'Account Activation Required',
    primaryText: 'To use this add-in and process, please activate your account from Email first, and then make a payment to complete your account setup.',
    secondaryText: 'After activating your account from the email we sent, click the button below to make a payment and activate your subscription.',
  },
  expired: {
    title: 'Subscription Required',
    primaryText: 'Your subscription has expired or you don\'t have an active subscription. To continue using ThinkDoc, please make a payment to activate your subscription.',
    secondaryText: 'By clicking the button below, you will be redirected to our secure payment page where you can complete your subscription purchase.',
  },
} as const;

/**
 * PaymentMessage Component
 * 
 * Displays appropriate payment message based on account type
 * 
 * @param props - Component props
 * @returns JSX element with payment message
 */
export const PaymentMessage: React.FC<PaymentMessageProps> = ({ isNewAccount }) => {
  const messageConfig = isNewAccount ? MESSAGE_CONFIG.newAccount : MESSAGE_CONFIG.expired;

  return (
    <>
      <h1 style={paymentMessageStyles.title}>
        {messageConfig.title}
      </h1>
      
      <p style={paymentMessageStyles.primaryText}>
        {messageConfig.primaryText}
      </p>

      <p style={paymentMessageStyles.secondaryText}>
        {messageConfig.secondaryText}
      </p>
    </>
  );
};

