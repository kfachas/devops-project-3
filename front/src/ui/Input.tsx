import type { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  onValueChange?: (value: string) => void;
}

export function Input({ label, error, onValueChange, className, ...rest }: InputProps) {
  const inputClasses = ['ds-input', error ? 'ds-input--invalid' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <label className="ds-field">
      {label && <span className="ds-field__label">{label}</span>}
      <input
        className={inputClasses}
        onChange={(event) => onValueChange?.(event.target.value)}
        {...rest}
      />
      {error && <span className="ds-field__error">{error}</span>}
    </label>
  );
}
