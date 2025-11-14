import React, { useCallback, useEffect, useState } from 'react';
import {
  getSystemStatus,
  getSystemStatusSummary,
  getSystemStatusTimeline,
  createSystemStatusSnapshot,
} from '../utils/api';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './SystemStatus.css';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    status: '',
    uptime: '',
    heartbeatAt: '',
    notes: '',
  });
  const [snapshotErrors, setSnapshotErrors] = useState({});

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const response = await getSystemStatus();
      setStatus(response.data);
      const [summaryRes, timelineRes] = await Promise.all([
        getSystemStatusSummary().catch(() => null),
        getSystemStatusTimeline().catch(() => null),
      ]);
      setSummary(summaryRes?.data ?? null);
      setTimeline(timelineRes?.data ?? []);
    } catch (error) {
      showNotification('시스템 상태를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch (error) {
      return value;
    }
  };

  const handleOpenSnapshotModal = () => {
    setSnapshotForm({
      status: summary?.status || '',
      uptime: summary?.uptimeText || '',
      heartbeatAt: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    setSnapshotErrors({});
    setIsSnapshotModalOpen(true);
  };

  const handleCloseSnapshotModal = () => {
    setIsSnapshotModalOpen(false);
    setSnapshotForm({
      status: '',
      uptime: '',
      heartbeatAt: '',
      notes: '',
    });
    setSnapshotErrors({});
  };

  const validateSnapshot = () => {
    const errors = {};
    if (!snapshotForm.status.trim()) {
      errors.status = '상태는 필수입니다.';
    }
    if (!snapshotForm.heartbeatAt) {
      errors.heartbeatAt = '스냅샷 시간은 필수입니다.';
    }
    setSnapshotErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSnapshotSubmit = async (e) => {
    e.preventDefault();
    if (!validateSnapshot()) return;
    const payload = {
      status: snapshotForm.status.trim(),
      uptime: snapshotForm.uptime || null,
      heartbeatAt: snapshotForm.heartbeatAt ? new Date(snapshotForm.heartbeatAt).toISOString() : null,
      notes: snapshotForm.notes || null,
    };
    try {
      await createSystemStatusSnapshot(payload);
      showNotification('새 시스템 스냅샷이 등록되었습니다.', 'success');
      handleCloseSnapshotModal();
      fetchAll();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((err) => err.message).join(', ') ||
        '스냅샷 등록에 실패했습니다.';
      showNotification(message, 'error', 5000);
    }
  };

  if (loading) {
    return <div className="page-container">로딩 중...</div>;
  }

  return (
    <div className="page-container">
      <NotificationContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      <h1 className="page-title">시스템 상태</h1>
      <div className="page-content system-status-page">
        <section className="system-summary-grid">
          <SummaryCard
            title="현재 상태"
            icon="🩺"
            value={status?.status || '-'}
            description="실시간 상태 코드"
            status={status?.status}
            footer={status?.version ? `버전 ${status.version}` : null}
          />
          <SummaryCard
            title="평균 응답 시간"
            icon="⚡"
            value={summary?.avgResponseTime ? `${summary.avgResponseTime} ms` : '-'}
            description="최근 24시간 기준"
            status={summary?.status}
          />
          <SummaryCard
            title="활성 서비스"
            icon="🛰️"
            value={summary?.activeServices ?? '-'}
            description="현재 동작 중인 서비스 수"
            footer={summary?.inactiveServices ? `비활성 ${summary.inactiveServices}` : null}
          />
        </section>

        <section className="system-panels">
          <div className="system-panel">
            <div className="system-panel-header">
              <h2>상세 정보</h2>
              <button className="btn-primary" onClick={handleOpenSnapshotModal}>
                스냅샷 등록
              </button>
            </div>
            <div className="system-panel-body">
              <div className="system-detail-row">
                <span>업타임</span>
                <strong>{summary?.uptimeText || '-'}</strong>
              </div>
              <div className="system-detail-row">
                <span>최근 하트비트</span>
                <strong>{summary?.lastHeartbeat ? formatDate(summary.lastHeartbeat) : '-'}</strong>
              </div>
              <div className="system-detail-row">
                <span>경고</span>
                <strong className={summary?.warningCount ? 'text-warning' : 'text-muted'}>
                  {summary?.warningCount ?? 0}건
                </strong>
              </div>
              <div className="system-detail-row">
                <span>에러</span>
                <strong className={summary?.errorCount ? 'text-danger' : 'text-muted'}>
                  {summary?.errorCount ?? 0}건
                </strong>
              </div>
            </div>
          </div>

          <div className="system-panel">
            <div className="system-panel-header">
              <h2>최근 스냅샷 타임라인</h2>
              <span className="system-panel-subtitle">최신 10건</span>
            </div>
            <div className="system-panel-body timeline-body">
              {timeline?.length ? (
                timeline.map((item) => (
                  <div key={item.id || item.capturedAt} className="timeline-entry">
                    <div className="timeline-entry-header">
                      <StatusBadge status={item.status} size="small" />
                      <span className="timeline-date">{formatDate(item.capturedAt)}</span>
                    </div>
                    <div className="timeline-entry-body">
                      <div>
                        <strong>업타임</strong>
                        <span>{item.uptimeText || item.uptime || '-'}</span>
                      </div>
                      {item.notes && (
                        <div className="timeline-notes">
                          <strong>메모</strong>
                          <p>{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">스냅샷 데이터가 없습니다.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={handleCloseSnapshotModal}
        title="새 스냅샷 등록"
        size="medium"
      >
        <form onSubmit={handleSnapshotSubmit}>
          <div className="form-group">
            <label className="form-label">
              상태 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={snapshotForm.status}
              onChange={(e) => setSnapshotForm((prev) => ({ ...prev, status: e.target.value }))}
              placeholder="예: healthy, degraded"
            />
            {snapshotErrors.status && <div className="form-error">{snapshotErrors.status}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">업타임</label>
            <input
              className="form-input"
              value={snapshotForm.uptime}
              onChange={(e) => setSnapshotForm((prev) => ({ ...prev, uptime: e.target.value }))}
              placeholder="예: 12h 32m"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              하트비트 시간 <span className="required">*</span>
            </label>
            <input
              className="form-input"
              type="datetime-local"
              value={snapshotForm.heartbeatAt}
              onChange={(e) => setSnapshotForm((prev) => ({ ...prev, heartbeatAt: e.target.value }))}
            />
            {snapshotErrors.heartbeatAt && (
              <div className="form-error">{snapshotErrors.heartbeatAt}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={snapshotForm.notes}
              onChange={(e) => setSnapshotForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="추가 상세를 입력하세요"
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleCloseSnapshotModal}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              등록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SystemStatus;

