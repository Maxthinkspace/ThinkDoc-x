/**
 * Subscription Page Styles
 * 
 * Centralized style definitions for Subscription components.
 * Makes it easy to maintain and update styles consistently.
 * 
 * Separation of Concerns:
 * - Isolated style definitions
 * - Reusable style objects
 * - Easy to theme or customize
 */

export const subscriptionPageStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '90vh',
  padding: '20px',
  textAlign: 'center',
};

export const subscriptionPageContainerStyles: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
};

export const subscriptionMessageStyles = {
  title: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#333',
    fontWeight: 600 as const,
  } as React.CSSProperties,
  
  primaryText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '30px',
  } as React.CSSProperties,
  
  secondaryText: {
    fontSize: '14px',
    color: '#888',
    lineHeight: '1.5',
    marginBottom: '40px',
  } as React.CSSProperties,
};

export const subscriptionButtonStyles = {
  base: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 600 as const,
    color: '#fff',
    background: "linear-gradient(90deg, #129EFF 0%, #5800FF 100%)",

    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    minWidth: '200px',
  } as React.CSSProperties,
  
  disabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  
  hover: {
    backgroundColor: '#106ebe',
  },
};

