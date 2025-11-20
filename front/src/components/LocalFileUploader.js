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

const FILE_TYPE_CONFIG = {
  excel: {
    extensions: ['xlsx', 'xls', 'csv'],
    helperText: '엑셀/CSV 파일 (.xlsx, .xls, .csv)과 HTML 파일 (.html, .htm)을 모두 업로드할 수 있습니다.',
  },
  html: {
    extensions: ['html', 'htm'],
  },
};

const ACCEPT_ALL = Object.values(FILE_TYPE_CONFIG)
  .map(({ extensions }) => extensions.map(ext => `.${ext}`).join(','))
  .join(',');

const normalizeExtension = (fileName = '') => {
  const [, extension = ''] = fileName.toLowerCase().match(/\.([0-9a-z]+)$/i) || [];
  return extension;
};

const LocalFileUploader = ({
  onUpload,
  onExcelUpload,
  onHtmlUpload,
  onMultipleUpload,
  disabled,
  multiple = false,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [detectedType, setDetectedType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const handlerByType = useMemo(() => ({
    excel: onExcelUpload || onUpload,
    html: onHtmlUpload || onUpload,
  }), [onExcelUpload, onUpload, onHtmlUpload]);

  const resetInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    setErrorMessage('');

    if (files.length === 0) {
      setSelectedFile(null);
      setSelectedFiles([]);
      setDetectedType(null);
      return;
    }

    // 다중 파일 선택 모드
    if (multiple) {
      const validFiles = [];
      const invalidFiles = [];

      files.forEach(file => {
        const extension = normalizeExtension(file.name);
        if (FILE_TYPE_CONFIG.excel.extensions.includes(extension) || 
            FILE_TYPE_CONFIG.html.extensions.includes(extension)) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (invalidFiles.length > 0) {
        setErrorMessage(`다음 파일들은 지원하지 않는 형식입니다: ${invalidFiles.join(', ')}`);
      }

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        setSelectedFile(null);
        setDetectedType(null);
      } else {
        resetInput();
        setSelectedFiles([]);
        setSelectedFile(null);
        setDetectedType(null);
      }
      return;
    }

    // 단일 파일 선택 모드 (기존 로직)
    const file = files[0];
    const extension = normalizeExtension(file.name);
    if (FILE_TYPE_CONFIG.excel.extensions.includes(extension)) {
      setSelectedFile(file);
      setSelectedFiles([]);
      setDetectedType('excel');
      return;
    }

    if (FILE_TYPE_CONFIG.html.extensions.includes(extension)) {
      setSelectedFile(file);
      setSelectedFiles([]);
      setDetectedType('html');
      return;
    }

    resetInput();
    setSelectedFile(null);
    setSelectedFiles([]);
    setDetectedType(null);
    setErrorMessage('지원하지 않는 파일 형식입니다. 엑셀/CSV 또는 HTML 파일만 업로드할 수 있습니다.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    // 다중 파일 업로드 모드
    if (multiple) {
      if (selectedFiles.length === 0) {
        setErrorMessage('업로드할 파일을 선택해주세요.');
        return;
      }

      if (onMultipleUpload) {
        setIsUploading(true);
        try {
          await onMultipleUpload(selectedFiles);
          setSelectedFiles([]);
          setSelectedFile(null);
          setDetectedType(null);
          resetInput();
        } catch (error) {
          // 상위 컴포넌트에서 에러 노출 처리
        } finally {
          setIsUploading(false);
        }
        return;
      } else {
        setErrorMessage('다중 파일 업로드 핸들러가 구성되지 않았습니다.');
        return;
      }
    }

    // 단일 파일 업로드 모드 (기존 로직)
    if (!selectedFile) {
      setErrorMessage('업로드할 파일을 선택해주세요.');
      return;
    }

    const uploadHandler = detectedType ? handlerByType[detectedType] : null;
    if (!uploadHandler) {
      setErrorMessage('선택한 파일 형식을 처리할 수 있는 핸들러가 구성되지 않았습니다.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadHandler(selectedFile);
      setSelectedFile(null);
      setSelectedFiles([]);
      setDetectedType(null);
      resetInput();
    } catch (error) {
      // 상위 컴포넌트에서 에러 노출 처리
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitDisabled = multiple 
    ? (selectedFiles.length === 0 || isUploading || disabled || !onMultipleUpload)
    : (!selectedFile || isUploading || disabled || !handlerByType[detectedType]);

  return (
    <div className="local-file-uploader">
      <form className="local-file-uploader__form" onSubmit={handleSubmit}>
        <div className="local-file-uploader__input-group">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ALL}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={isUploading || disabled}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitDisabled}
          >
            {isUploading ? '업로드 중...' : `업로드${multiple && selectedFiles.length > 0 ? ` (${selectedFiles.length}개)` : ''}`}
          </button>
        </div>
        <p className="local-file-uploader__hint">
          {FILE_TYPE_CONFIG.excel.helperText}
        </p>
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
  onMultipleUpload: PropTypes.func,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
};

LocalFileUploader.defaultProps = {
  onUpload: null,
  onExcelUpload: null,
  onHtmlUpload: null,
  onMultipleUpload: null,
  disabled: false,
  multiple: false,
};

export default LocalFileUploader;
