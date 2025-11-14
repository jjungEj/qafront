import React from 'react';
import StatusBadge from './StatusBadge';
import './SummaryCard.css';

const SummaryCard = ({
  title,
  value,
  description,
  icon,
  footer,
  status,
  loading = false,
}) => {
  return (
    <div className="summary-card">
      <div className="summary-card-header">
        <div className="summary-card-title">
          {icon && <span className="summary-card-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        {status && <StatusBadge status={status} size="small" />}
      </div>
      <div className="summary-card-body">
        {loading ? (
          <div className="summary-card-skeleton" />
        ) : (
          <span className="summary-card-value">{value ?? '-'}</span>
        )}
        {description && <p className="summary-card-description">{description}</p>}
      </div>
      {footer && <div className="summary-card-footer">{footer}</div>}
    </div>
  );
};

export default SummaryCard;
