import React from 'react';
import './Card.css';

export default function Card({
  children,
  title,
  subtitle,
  action,
  className = '',
  footer,
  ...props
}) {
  return (
    <div className={`ef-card ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div className="ef-card__header">
          <div>
            {title && <h3 className="ef-card__title">{title}</h3>}
            {subtitle && <p className="ef-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="ef-card__action">{action}</div>}
        </div>
      )}
      <div className="ef-card__body">{children}</div>
      {footer && <div className="ef-card__footer">{footer}</div>}
    </div>
  );
}
