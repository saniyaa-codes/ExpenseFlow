import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    type = 'text',
    id,
    name,
    icon: Icon,
    required = false,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || name;

  return (
    <div className={`ef-input-group ${error ? 'ef-input-group--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ef-input-label">
          {label}
          {required && <span className="ef-input-required" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="ef-input-wrapper">
        {Icon && <Icon className="ef-input-icon" size={18} />}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          required={required}
          className={`ef-input-field ${Icon ? 'ef-input-field--has-icon' : ''}`}
          {...props}
        />
      </div>

      {error ? (
        <span className="ef-input-error" role="alert">{error}</span>
      ) : helperText ? (
        <span className="ef-input-helper">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Input;
