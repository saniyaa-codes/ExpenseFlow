import React from 'react';
import './Badge.css';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon: Icon
}) {
  return (
    <span className={`ef-badge ef-badge--${variant} ef-badge--${size} ${className}`}>
      {Icon && <Icon size={12} className="ef-badge__icon" />}
      <span>{children}</span>
    </span>
  );
}
