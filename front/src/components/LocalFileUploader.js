/**
* @ClassName	: LocalFileUploader.js
* @Description	: 로컬 파일 업로드를 위한 컴포넌트, 엑셀/CSV 파일 선택 및 업로드 처리
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 파일 선택 및 업로드 기능 구현
* 								- 업로드 중 상태 관리 및 비활성화 처리
*/
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
