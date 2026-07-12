import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
}

export function Select({ label, options, onValueChange, ...rest }: SelectProps) {
  return (
    <label className="ds-field">
      {label && <span className="ds-field__label">{label}</span>}
      <span className="ds-select__wrap">
        <select
          className="ds-select"
          onChange={(event) => onValueChange?.(event.target.value)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="ds-select__chev">
          <Icon name="chevron-down" size={18} />
        </span>
      </span>
    </label>
  );
}
