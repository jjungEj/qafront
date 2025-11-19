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
import React, { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './LocalFileUploader.css';

const TAB_CONFIG = [
  {
    key: 'excel',
    label: '엑셀 업로드',
    accept: '.xlsx,.xls,.csv',
    helperText: '엑셀/CSV 파일만 선택할 수 있습니다. (.xlsx, .xls, .csv)',
  },
  {
    key: 'html',
    label: 'HTML 업로드',
    accept: '.html,.htm',
    helperText: 'HTML 파일만 선택할 수 있습니다. (.html, .htm)',
  },
];

const normalizeExtension = (fileName = '') => {
  const [, extension = ''] = fileName.toLowerCase().match(/\.([0-9a-z]+)$/i) || [];
  return extension;
};

const LocalFileUploader = ({
  onUpload,
  onExcelUpload,
  onHtmlUpload,
  disabled,
}) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [selectedFiles, setSelectedFiles] = useState({ excel: null, html: null });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const tabHandlers = useMemo(() => ({
    excel: onExcelUpload || onUpload,
    html: onHtmlUpload,
  }), [onExcelUpload, onUpload, onHtmlUpload]);

  const currentHandler = tabHandlers[activeTab];

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (file, tabKey) => {
    if (!file) return false;
    const extension = normalizeExtension(file.name);
    if (tabKey === 'html') {
      return ['html', 'htm'].includes(extension);
    }
    return ['xlsx', 'xls', 'csv'].includes(extension);
  };

  const handleTabChange = (tabKey) => {
    if (activeTab === tabKey) return;
    setActiveTab(tabKey);
    setErrorMessage('');
    resetInput();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setErrorMessage('');

    if (file && !validateFile(file, activeTab)) {
      resetInput();
      setSelectedFiles(prev => ({ ...prev, [activeTab]: null }));
      setErrorMessage(
        activeTab === 'html' ? 'HTML 파일만 업로드할 수 있습니다.' : '엑셀/CSV 파일만 업로드할 수 있습니다.'
      );
      return;
    }

    setSelectedFiles(prev => ({ ...prev, [activeTab]: file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!currentHandler) {
      setErrorMessage('선택한 업로드 방식에 대한 처리가 구성되지 않았습니다.');
      return;
    }

    const file = selectedFiles[activeTab];
    if (!file) {
      setErrorMessage('업로드할 파일을 선택해주세요.');
      return;
    }

    setIsUploading(true);
    try {
      await currentHandler(file);
      setSelectedFiles(prev => ({ ...prev, [activeTab]: null }));
      resetInput();
    } catch (error) {
      // 상위 컴포넌트에서 에러 노출 처리
    } finally {
      setIsUploading(false);
    }
  };

  const activeTabConfig = TAB_CONFIG.find(tab => tab.key === activeTab);
  const isSubmitDisabled = !selectedFiles[activeTab] || isUploading || disabled || !currentHandler;

  return (
    <div className="local-file-uploader">
      <div className="local-file-uploader__tabs">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`local-file-uploader__tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
            disabled={disabled || !tabHandlers[tab.key]}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form className="local-file-uploader__form" onSubmit={handleSubmit}>
        <div className="local-file-uploader__input-group">
          <input
            ref={fileInputRef}
            type="file"
            accept={activeTabConfig?.accept}
            onChange={handleFileChange}
            disabled={isUploading || disabled || !currentHandler}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitDisabled}
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
        {activeTabConfig?.helperText && (
          <p className="local-file-uploader__hint">{activeTabConfig.helperText}</p>
        )}
        {errorMessage && (
          <p className="local-file-uploader__error">{errorMessage}</p>
        )}
      </form>
    </div>
  );
};

LocalFileUploader.propTypes = {
  onUpload: PropTypes.func,
  onExcelUpload: PropTypes.func,
  onHtmlUpload: PropTypes.func,
  disabled: PropTypes.bool,
};

LocalFileUploader.defaultProps = {
  onUpload: null,
  onExcelUpload: null,
  onHtmlUpload: null,
  disabled: false,
};

export default LocalFileUploader;
