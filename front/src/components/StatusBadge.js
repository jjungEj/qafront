import React from 'react';
import './StatusBadge.css';

const STATUS_COLOR_MAP = {
  pending: 'status-badge-pending',
  processing: 'status-badge-processing',
  running: 'status-badge-processing',
  completed: 'status-badge-completed',
  success: 'status-badge-completed',
  failed: 'status-badge-failed',
  error: 'status-badge-failed',
  inactive: 'status-badge-inactive',
  active: 'status-badge-active',
};

const normalizeStatus = (status) => {
  if (!status) return '';
  return String(status).toLowerCase().replace(/\s+/g, '-');
};

const humanizeStatus = (status) => {
  if (!status) return '-';
  return String(status)
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const StatusBadge = ({ status, label, size = 'medium', className = '' }) => {
  const normalized = normalizeStatus(status);
  const colorClass = STATUS_COLOR_MAP[normalized] || 'status-badge-default';
  const sizeClass = `status-badge-${size}`;

  return (
    <span className={`status-badge ${sizeClass} ${colorClass} ${className}`.trim()}>
      {label || humanizeStatus(status)}
    </span>
  );
};

export default StatusBadge;
