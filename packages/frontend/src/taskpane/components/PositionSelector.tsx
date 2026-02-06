import * as React from 'react';
import type { ReactNode } from 'react';
import {
  Dropdown,
  Option,
  makeStyles,
  Label,
  Spinner,
  Divider,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#333',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    color: '#666',
    fontSize: '13px',
  },
});

export interface PositionSelectorProps {
  positions: string[];
  selectedPosition: string | null;
  onChange: (position: string | null) => void;
  isLoading?: boolean;
  label?: ReactNode;
  placeholder?: string;
}

export const PositionSelector: React.FC<PositionSelectorProps> = ({
  positions,
  selectedPosition,
  onChange,
  isLoading = false,
  label = 'Indicate your position',
  placeholder = 'Select your position...',
}) => {
  const styles = useStyles();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Label className={styles.label}>{label}</Label>
        <div className={styles.loadingContainer}>
          <Spinner size="tiny" />
          <span>Extracting positions from contract...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Label className={styles.label}>{label}</Label>
      <Dropdown
        placeholder={placeholder}
        value={selectedPosition || ''}
        onOptionSelect={(_, data) => {
          onChange(data.optionValue === 'neutral' ? 'Neutral' : data.optionValue || null);
        }}
        style={{ 
          width: '200px',
          minWidth: '200px',
          maxWidth: '200px',
        }}
      >
        {positions.map((position) => (
          <Option key={position} value={position}>
            {position}
          </Option>
        ))}
        
        {positions.length > 0 && <Divider />}
        
        <Option key="neutral" value="neutral" style={{ fontStyle: 'italic' }}>
          Neutral
        </Option>
      </Dropdown>
    </div>
  );
};

export default PositionSelector;
