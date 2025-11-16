import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './LocalFileUploader.css';

const LocalFileUploader = ({ onUpload, disabled }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile || !onUpload) {
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      event.target.reset();
    } catch (error) {
      // 상위 onUpload에서 에러 처리를 담당합니다.
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form className="local-file-uploader" onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={isUploading || disabled}
      />
      <button type="submit" className="btn-primary" disabled={!selectedFile || isUploading || disabled}>
        {isUploading ? '업로드 중...' : '업로드'}
      </button>
    </form>
  );
};

LocalFileUploader.propTypes = {
  onUpload: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

LocalFileUploader.defaultProps = {
  disabled: false,
};

export default LocalFileUploader;
