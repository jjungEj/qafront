import React from 'react';
import StatusBadge from './StatusBadge';
import './DetailPanel.css';

const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value ?? '-'}</span>
  </div>
);

const DetailPanel = ({
  title,
  status,
  actions,
  sections = [],
  footer,
  emptyMessage = '선택된 항목이 없습니다.',
}) => {
  if (!sections.length) {
    return (
      <aside className="detail-panel empty">
        <div className="detail-empty-state">{emptyMessage}</div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <h2 className="detail-title">{title}</h2>
          {status && <StatusBadge status={status} />}
        </div>
        {actions && <div className="detail-actions">{actions}</div>}
      </div>

      <div className="detail-content">
        {sections.map((section) => (
          <section key={section.title} className="detail-section">
            <h3 className="detail-section-title">{section.title}</h3>
            <div className="detail-section-body">
              {section.items.map((item) => (
                <DetailRow key={item.label} label={item.label} value={item.value} />
              ))}
              {section.extra}
            </div>
          </section>
        ))}
      </div>

      {footer && <div className="detail-footer">{footer}</div>}
    </aside>
  );
};

export default DetailPanel;
