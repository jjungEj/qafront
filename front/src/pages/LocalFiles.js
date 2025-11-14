import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getLocalFiles,
  getLocalFileSummary,
  createLocalFile,
  updateLocalFile,
  deleteLocalFile,
  uploadLocalFile,
} from '../utils/api';
import FilterBar from '../components/FilterBar';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { NotificationContainer } from '../components/Notification';
import LocalFileUploader from '../components/LocalFileUploader';
import './Page.css';
import './LocalFiles.css';

const DEFAULT_FORM = {
  fileName: '',
  fileSize: '',
  fileType: '',
  status: 'pending',
  queuedAt: '',
  completedAt: '',
  deletable: false,
};

const LocalFiles = () => {
  const [localFiles, setLocalFiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editingFile, setEditingFile] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getLocalFileSummary();
      setSummary(res.data);
    } catch (error) {
      showNotification('로컬 파일 요약을 불러오지 못했습니다.', 'error');
    }
  }, [showNotification]);

  const fetchLocalFileList = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status || undefined,
        search: filters.search || undefined,
        startedAfter: filters.startDate || undefined,
        completedBefore: filters.endDate || undefined,
      };
      const res = await getLocalFiles(params);
      setLocalFiles(res.data);
    } catch (error) {
      showNotification('로컬 파일 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.endDate, filters.search, filters.startDate, filters.status, showNotification]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchLocalFileList();
  }, [fetchLocalFileList]);

  const handleOpenModal = (file) => {
    if (file) {
      setEditingFile(file);
      setFormData({
        fileName: file.fileName || '',
        fileSize: file.fileSize ?? '',
        fileType: file.fileType || '',
        status: file.status || 'pending',
        queuedAt: file.queuedAt ? toLocalDatetimeInput(file.queuedAt) : '',
        completedAt: file.completedAt ? toLocalDatetimeInput(file.completedAt) : '',
        deletable: Boolean(file.deletable),
      });
    } else {
      setEditingFile(null);
      setFormData(DEFAULT_FORM);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFile(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fileName.trim()) {
      errors.fileName = '파일 이름은 필수입니다.';
    }
    if (!formData.fileType.trim()) {
      errors.fileType = '파일 형식은 필수입니다.';
    }
    if (formData.fileSize && Number.isNaN(Number(formData.fileSize))) {
      errors.fileSize = '파일 크기는 숫자여야 합니다.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    const payload = {
      fileName: formData.fileName.trim(),
      fileSize: formData.fileSize ? Number(formData.fileSize) : null,
      fileType: formData.fileType.trim(),
      status: formData.status,
      queuedAt: formData.queuedAt ? new Date(formData.queuedAt).toISOString() : null,
      completedAt: formData.completedAt ? new Date(formData.completedAt).toISOString() : null,
      deletable: Boolean(formData.deletable),
    };
    try {
      if (editingFile) {
        await updateLocalFile(editingFile.id, payload);
        showNotification('로컬 파일이 수정되었습니다.', 'success');
      } else {
        await createLocalFile(payload);
        showNotification('로컬 파일이 추가되었습니다.', 'success');
      }
      handleCloseModal();
      fetchLocalFileList();
      fetchSummary();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '로컬 파일 저장에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  const handleFileUpload = useCallback(
    async (file) => {
      try {
        const response = await uploadLocalFile(file);
        const newFile = response.data;
        setLocalFiles((prev) => {
          const filtered = prev.filter((item) => item.id !== newFile.id);
          return [newFile, ...filtered];
        });
        showNotification('업로드가 완료되었습니다.', 'success');
        fetchSummary();
        return newFile;
      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.response?.data?.errors?.map((err) => err.message).join(', ') ||
          error.message ||
          '업로드에 실패했습니다.';
        showNotification(message, 'error', 5000);
        throw error;
      }
    },
    [fetchSummary, showNotification]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('정말로 이 로컬 파일을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deleteLocalFile(id);
      showNotification('로컬 파일이 삭제되었습니다.', 'success');
      fetchLocalFileList();
      fetchSummary();
    } catch (error) {
      const message = error.response?.data?.message || '로컬 파일 삭제에 실패했습니다.';
      showNotification(message, 'error');
    }
  };

  const filteredSummaryFooter = useMemo(() => {
    if (!summary) return null;
    return `처리중 ${summary.processingCount ?? 0} • 실패 ${summary.failedCount ?? 0}`;
  }, [summary]);

  const toLocalDatetimeInput = (value) => {
    try {
      return new Date(value).toISOString().slice(0, 16);
    } catch (error) {
      return '';
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch (error) {
      return value;
    }
  };

  return (
    <div className="page-container">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <h1 className="page-title">로컬 파일 관리</h1>
      <div className="page-content">
        <section className="local-files-summary">
          <SummaryCard
            title="총 파일"
            icon="📦"
            value={summary?.totalCount ?? '-'}
            description="등록된 전체 문서 수"
            status={summary?.latestStatus}
            footer={summary ? `삭제 가능 ${summary.deletableCount ?? 0}` : null}
          />
          <SummaryCard
            title="대기 큐"
            icon="⏳"
            value={summary?.pendingCount ?? 0}
            description="처리 대기 중인 파일"
            status="pending"
            footer={filteredSummaryFooter}
          />
          <SummaryCard
            title="완료"
            icon="✅"
            value={summary?.completedCount ?? 0}
            description="처리 완료된 파일"
            status="completed"
            footer={summary?.lastCompletedAt ? `최근 완료: ${formatDate(summary.lastCompletedAt)}` : null}
          />
          </section>

          <FilterBar
            rightActions={
              <div className="local-file-actions">
                <LocalFileUploader onUpload={handleFileUpload} />
                <button className="btn-primary" onClick={() => handleOpenModal(null)}>
                  새 로컬 파일 등록
                </button>
              </div>
            }
          >
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
          </select>
          <input
            className="form-input"
            type="search"
            placeholder="문서명 검색"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <div className="date-range-inputs">
            <input
              className="form-input"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
            <span>~</span>
            <input
              className="form-input"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </FilterBar>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>파일명</th>
                <th>크기</th>
                <th>형식</th>
                <th>상태</th>
                <th>큐 등록</th>
                <th>완료</th>
                <th>삭제 가능</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-message">
                    로딩 중...
                  </td>
                </tr>
              ) : localFiles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-message">
                    로컬 파일이 없습니다.
                  </td>
                </tr>
              ) : (
                localFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.id}</td>
                    <td>{file.fileName}</td>
                    <td>{file.fileSize ? `${file.fileSize.toLocaleString()} bytes` : '-'}</td>
                    <td>{file.fileType || '-'}</td>
                    <td>
                      <StatusBadge status={file.status} size="small" />
                    </td>
                    <td>{formatDate(file.queuedAt)}</td>
                    <td>{formatDate(file.completedAt)}</td>
                    <td>{file.deletable ? '가능' : '불가'}</td>
                    <td>
                      <button className="btn-edit" onClick={() => handleOpenModal(file)}>
                        수정
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(file.id)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFile ? '로컬 파일 수정' : '새 로컬 파일 등록'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              파일명 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={formData.fileName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fileName: e.target.value }))}
              placeholder="파일명을 입력하세요"
            />
            {formErrors.fileName && <div className="form-error">{formErrors.fileName}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">파일 크기 (byte)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={formData.fileSize}
              onChange={(e) => setFormData((prev) => ({ ...prev, fileSize: e.target.value }))}
            />
            {formErrors.fileSize && <div className="form-error">{formErrors.fileSize}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              파일 형식 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={formData.fileType}
              onChange={(e) => setFormData((prev) => ({ ...prev, fileType: e.target.value }))}
              placeholder="예: application/pdf"
            />
            {formErrors.fileType && <div className="form-error">{formErrors.fileType}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">상태</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">대기중</option>
              <option value="processing">처리중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>

          <div className="form-group form-row">
            <div>
              <label className="form-label">큐 등록 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={formData.queuedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, queuedAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">완료 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={formData.completedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, completedAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.deletable}
                onChange={(e) => setFormData((prev) => ({ ...prev, deletable: e.target.checked }))}
              />
              삭제 가능
            </label>
            <span className="form-help">삭제 가능 여부에 따라 목록에서 삭제 버튼이 활성화됩니다.</span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingFile ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LocalFiles;
