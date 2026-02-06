/**
 * Custom Hook: usePaymentDialog
 * 
 * Handles payment dialog operations using Office Add-in dialog API.
 * Provides a clean interface for opening payment dialogs and handling
 * dialog events (close, message, errors).
 * 
 * Separation of Concerns:
 * - Isolates Office dialog API logic
 * - Handles dialog lifecycle management
 * - Provides reusable payment dialog functionality
 */

import { useState, useCallback } from 'react';
import { backendApi } from '../../../../services/api';

export interface PaymentDialogConfig {
  height?: number;
  width?: number;
  paymentUrl?: string;
}

export interface UsePaymentDialogReturn {
  isOpening: boolean;
  openPaymentDialog: (onComplete: () => void, config?: PaymentDialogConfig) => Promise<void>;
}

const DEFAULT_DIALOG_CONFIG: PaymentDialogConfig = {
  height: 70,
  width: 50,
};

/**
 * Custom hook for managing payment dialog operations
 * 
 * @returns {UsePaymentDialogReturn} Object with isOpening state and openPaymentDialog function
 */
export const usePaymentDialog = (): UsePaymentDialogReturn => {
  const [isOpening, setIsOpening] = useState(false);

  /**
   * Opens payment dialog using Office Add-in dialog API
   * 
   * @param onComplete - Callback function to execute when payment dialog closes
   * @param config - Optional configuration for dialog size and payment URL
   */
  const openPaymentDialog = useCallback(
    async (onComplete: () => void, config: PaymentDialogConfig = {}) => {
      setIsOpening(true);

      try {
        let paymentUrl = config.paymentUrl;

        // If no URL provided, create subscription and get URL
        if (!paymentUrl) {
          const subscriptionResponse = await backendApi.createSubscription({
            subscriptionType: 'professional',
            billingPeriod: 'monthly',
          });
          paymentUrl = subscriptionResponse.url;
        }

        const dialogConfig = { ...DEFAULT_DIALOG_CONFIG, ...config };

        // Check if Office API is available
        if (typeof Office === 'undefined' || !Office.context?.ui) {
          throw new Error('Office Add-in context is not available');
        }

        Office.context.ui.displayDialogAsync(
          paymentUrl,
          { height: dialogConfig.height, width: dialogConfig.width },
          (dialogResult) => {
            setIsOpening(false);

            if (dialogResult.status === Office.AsyncResultStatus.Succeeded) {
              setupDialogEventHandlers(dialogResult.value, onComplete);
            } else {
              console.error('Failed to open payment dialog:', dialogResult.error);
              // Still call onComplete to allow user to retry
              onComplete();
            }
          }
        );
      } catch (error) {
        console.error('Error opening payment dialog:', error);
        setIsOpening(false);
        // Still call onComplete to allow user to retry
        onComplete();
      }
    },
    []
  );

  return {
    isOpening,
    openPaymentDialog,
  };
};

/**
 * Sets up event handlers for payment dialog
 * Handles dialog close events and message events from payment page
 * 
 * @param dialog - Office dialog object
 * @param onComplete - Callback to execute when dialog closes
 */
function setupDialogEventHandlers(
  dialog: Office.Dialog,
  onComplete: () => void
): void {
  let dialogClosed = false;

  const handleDialogClose = () => {
    if (!dialogClosed) {
      dialogClosed = true;
      onComplete();
    }
  };

  // Listen for dialog close event (error code 12006 = user closed dialog)
  dialog.addEventHandler(Office.EventType.DialogEventReceived, (args: any) => {
    if (args.error === 12006) {
      handleDialogClose();
    }
  });

  // Listen for message events from payment page (e.g., payment success)
  dialog.addEventHandler(Office.EventType.DialogMessageReceived, (args: any) => {
    if (!dialogClosed) {
      console.log('Payment dialog message:', args);
      dialog.close();
      handleDialogClose();
    }
  });
}
