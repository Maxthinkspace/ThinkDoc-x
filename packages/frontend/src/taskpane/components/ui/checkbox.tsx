import * as React from "react";
import { Checkbox as FluentCheckbox, CheckboxProps as FluentCheckboxProps } from "@fluentui/react-components";

interface CheckboxProps extends Omit<FluentCheckboxProps, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  checked, 
  onCheckedChange, 
  id,
  className,
  style,
  ...props 
}) => {
  const handleChange = (_ev: React.ChangeEvent<HTMLInputElement>, data: { checked: boolean | "mixed" }) => {
    if (onCheckedChange && typeof data.checked === 'boolean') {
      onCheckedChange(data.checked);
    }
  };

  return (
    <FluentCheckbox
      checked={checked}
      onChange={handleChange}
      id={id}
      className={className}
      style={style}
      {...props}
    />
  );
};
