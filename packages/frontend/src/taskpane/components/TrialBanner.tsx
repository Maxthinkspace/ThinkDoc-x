/**
 * Trial Banner Component
 * 
 * Displays a banner at the top or bottom of the app when user is on a trial subscription
 */

import * as React from 'react';

export interface TrialBannerProps {
  trialEndDate?: string | null;
  position?: 'top' | 'bottom';
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ 
  trialEndDate, 
  position = 'top' 
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const bannerStyle: React.CSSProperties = {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    padding: '6px 8px',
    margin: position === 'top' ? '0' : '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#856404',
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    margin: 0,
  };

  return (
    <div style={bannerStyle}>
      <p style={textStyle}>
        <strong>🎉</strong>
        {trialEndDate && (
          <>Your trial ends on {formatDate(trialEndDate)}</>
        )}
      </p>
    </div>
  );
};

export default TrialBanner;

