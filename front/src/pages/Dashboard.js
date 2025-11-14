import React, { useEffect, useState } from 'react';
import {
  getLocalFileSummary,
  getResultSummary,
  getSystemStatusSummary,
  getPipelineTimeline,
} from '../utils/api';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './Dashboard.css';

const Dashboard = () => {
  const [localSummary, setLocalSummary] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [pipelineTimeline, setPipelineTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [
          localSummaryRes,
          resultSummaryRes,
          systemSummaryRes,
          pipelineTimelineRes,
        ] = await Promise.all([
          getLocalFileSummary().catch(() => null),
          getResultSummary().catch(() => null),
          getSystemStatusSummary().catch(() => null),
          getPipelineTimeline().catch(() => null),
        ]);

        setLocalSummary(localSummaryRes?.data ?? null);
        setResultSummary(resultSummaryRes?.data ?? null);
        setSystemSummary(systemSummaryRes?.data ?? null);
        setPipelineTimeline(pipelineTimelineRes?.data ?? []);
      } catch (error) {
        showNotification('대시보드 데이터를 불러오는데 실패했습니다.', 'error', 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const renderTimeline = () => {
    if (!pipelineTimeline?.length) {
      return <div className="empty-state">최근 파이프라인 실행 정보가 없습니다.</div>;
    }

    return pipelineTimeline.map((event) => (
      <div className="timeline-item" key={event.id || event.startedAt}>
        <div className="timeline-meta">
          <h4 className="timeline-title">{event.pipelineName || `파이프라인 #${event.pipelineId}`}</h4>
          <StatusBadge status={event.status} size="small" />
        </div>
        <div className="timeline-times">
          <span>시작: {formatDate(event.startedAt)}</span>
          <span>종료: {formatDate(event.finishedAt)}</span>
        </div>
        {event.documentName && (
          <div className="timeline-desc">문서: {event.documentName}</div>
        )}
        {event.errorMessage && (
          <div className="timeline-error">에러: {event.errorMessage}</div>
        )}
      </div>
    ));
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch (err) {
      return value;
    }
  };

  return (
    <div className="page-container">
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
      <h1 className="page-title">대시보드</h1>
      <div className="page-content">
        <section className="dashboard-summary-grid">
          <SummaryCard
            title="로컬 파일"
            icon="📁"
            value={localSummary?.totalCount ?? '-'}
            description="총 업로드 문서 수"
            status={localSummary?.latestStatus}
            loading={loading}
            footer={
              localSummary
                ? `대기중 ${localSummary.pendingCount ?? 0} • 완료 ${localSummary.completedCount ?? 0}`
                : null
            }
          />
          <SummaryCard
            title="결과"
            icon="✅"
            value={resultSummary?.totalCount ?? '-'}
            description="처리된 결과 건수"
            status={resultSummary?.latestStatus}
            loading={loading}
            footer={
              resultSummary
                ? `성공 ${resultSummary.successCount ?? 0} • 실패 ${resultSummary.failedCount ?? 0}`
                : null
            }
          />
          <SummaryCard
            title="시스템 업타임"
            icon="⏱️"
            value={systemSummary?.uptimeText ?? '-'}
            description="최근 시스템 가동 시간"
            status={systemSummary?.status}
            loading={loading}
            footer={systemSummary?.lastHeartbeat ? `최근 하트비트: ${formatDate(systemSummary.lastHeartbeat)}` : null}
          />
        </section>

        <section className="dashboard-sections">
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2>최근 파이프라인 타임라인</h2>
              <span className="dashboard-panel-subtitle">최신 실행 순으로 표시됩니다.</span>
            </div>
            <div className="dashboard-panel-body">{renderTimeline()}</div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2>시스템 상태</h2>
              <span className="dashboard-panel-subtitle">요약 스냅샷</span>
            </div>
            <div className="dashboard-panel-body">
              {systemSummary ? (
                <ul className="system-summary-list">
                  <li>
                    <span>현재 상태</span>
                    <StatusBadge status={systemSummary.status} />
                  </li>
                  <li>
                    <span>평균 응답 시간</span>
                    <strong>{systemSummary.avgResponseTime ?? '-'} ms</strong>
                  </li>
                  <li>
                    <span>활성 서비스</span>
                    <strong>{systemSummary.activeServices ?? '-'}</strong>
                  </li>
                  <li>
                    <span>경고</span>
                    <strong className={systemSummary.warningCount ? 'text-warning' : 'text-muted'}>
                      {systemSummary.warningCount ?? 0}건
                    </strong>
                  </li>
                </ul>
              ) : (
                <div className="empty-state">시스템 요약 정보를 불러오지 못했습니다.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
