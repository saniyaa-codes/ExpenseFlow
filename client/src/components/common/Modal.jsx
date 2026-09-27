import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ef-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="ef-modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ef-modal-header">
          <h3 className="ef-modal-title">{title}</h3>
          <button
            type="button"
            className="ef-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ef-modal-body">{children}</div>

        {footer && <div className="ef-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
