import React from 'react';
import './FilterBar.css';

const FilterBar = ({ children, rightActions }) => {
  return (
    <div className="filter-bar">
      <div className="filter-bar-left">{children}</div>
      {rightActions && <div className="filter-bar-right">{rightActions}</div>}
    </div>
  );
};

export default FilterBar;
