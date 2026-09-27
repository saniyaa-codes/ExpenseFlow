import React from 'react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  isLoading = false,
  fullWidth = false,
  icon: Icon,
  onClick,
  className = '',
  ...props
}) {
  const buttonClasses = [
    'ef-btn',
    `ef-btn--${variant}`,
    `ef-btn--${size}`,
    fullWidth ? 'ef-btn--full' : '',
    isLoading ? 'ef-btn--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="ef-btn__spinner" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="ef-btn__icon" size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
      ) : null}
      <span className="ef-btn__text">{children}</span>
    </button>
  );
}
