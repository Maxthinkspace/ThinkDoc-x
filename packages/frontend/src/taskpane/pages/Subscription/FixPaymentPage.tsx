/**
 * Fix Payment Page Component
 * 
 * Displays when subscription status is 'past_due'
 * Shows a button to open the payment portal URL
 */

import * as React from 'react';
import { useToast } from '../../hooks/use-toast';

export interface FixPaymentPageProps {
  portalUrl: string;
}

export const FixPaymentPage: React.FC<FixPaymentPageProps> = ({ portalUrl }) => {
  const { toast } = useToast();

  const handleFixPayment = () => {
    try {
      // Open portal URL in browser
      window.open(portalUrl, '_blank');
    } catch (error) {
      console.error('Error opening payment portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open payment portal. Please try again.',
        variant: 'error',
      });
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '32px',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
    maxWidth: '500px',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#0078d4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Payment Required</h1>
      <p style={textStyle}>
        Your subscription payment is past due. Please update your payment method to continue using the service.
      </p>
      <button 
        onClick={handleFixPayment}
        style={buttonStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#106ebe';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#0078d4';
        }}
      >
        Fix Payment
      </button>
    </div>
  );
};

export default FixPaymentPage;

