import axios from 'axios';

// API Base URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (필요시 토큰 추가 등)
api.interceptors.request.use(
  (config) => {
    // 필요시 인증 토큰 추가
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 공통 에러 처리
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error [${status}]:`, data);
      
      // 404 에러
      if (status === 404) {
        console.error('리소스를 찾을 수 없습니다.');
      }
      // 400 에러 (검증 실패)
      else if (status === 400) {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => err.message).join(', ');
          console.error('검증 오류:', errorMessages);
        } else {
          console.error('요청 오류:', data.message || '잘못된 요청입니다.');
        }
      }
      // 500 에러
      else if (status >= 500) {
        console.error('서버 오류가 발생했습니다.');
      }
    } else if (error.request) {
      console.error('서버에 연결할 수 없습니다.');
    } else {
      console.error('요청 설정 중 오류가 발생했습니다:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==================== 로컬 파일 (Local Files) ====================
export const getLocalFiles = (params = {}) => api.get('/local-files', { params });
export const getLocalFile = (id) => api.get(`/local-files/${id}`);
export const createLocalFile = (data) => api.post('/local-files', data);
export const updateLocalFile = (id, data) => api.put(`/local-files/${id}`, data);
export const deleteLocalFile = (id) => api.delete(`/local-files/${id}`);
export const getLocalFileSummary = () => api.get('/local-files/summary');
export const uploadLocalFile = (file, config = {}) => {
  if (!file) {
    return Promise.reject(new Error('업로드할 파일이 필요합니다.'));
  }

  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    ...(config.headers || {}),
    'Content-Type': 'multipart/form-data',
  };

  return api.post('/local-files/upload', formData, {
    ...config,
    headers,
  });
};

// ==================== 모델 (Models) ====================
export const getModels = () => api.get('/models');
export const getModel = (id) => api.get(`/models/${id}`);
export const createModel = (data) => api.post('/models', data);
export const updateModel = (id, data) => api.put(`/models/${id}`, data);
export const deleteModel = (id) => api.delete(`/models/${id}`);

// ==================== 파이프라인 (Pipelines) ====================
export const getPipelines = (params = {}) => api.get('/pipelines', { params });
export const getPipeline = (id) => api.get(`/pipelines/${id}`);
export const createPipeline = (data) => api.post('/pipelines', data);
export const updatePipeline = (id, data) => api.put(`/pipelines/${id}`, data);
export const deletePipeline = (id) => api.delete(`/pipelines/${id}`);

// ==================== 결과 (Results) ====================
export const getResults = (params = {}) => api.get('/results', { params });
// 로컬 파일에서 업로드된 결과만 조회
export const getLocalFileResults = () => api.get('/results', { params: { fromLocalFiles: true } });
export const getResult = (id) => api.get(`/results/${id}`);
export const createResult = (data) => api.post('/results', data);
export const updateResult = (id, data) => api.put(`/results/${id}`, data);
export const deleteResult = (id) => api.delete(`/results/${id}`);
export const getResultSummary = () => api.get('/results/summary');
// HTML 수정
export const updateResultSheetHtml = (resultId, sheetId, htmlContent) => 
  api.put(`/results/${resultId}/sheets/${sheetId}/html`, { htmlContent });

// ==================== 피드백 (Feedback) ====================
export const getFeedbacks = (resultId = null) => {
  const params = resultId ? { resultId } : {};
  return api.get('/feedback', { params });
};
export const getFeedback = (id) => api.get(`/feedback/${id}`);
export const createFeedback = (data) => api.post('/feedback', data);
export const updateFeedback = (id, data) => api.put(`/feedback/${id}`, data);
export const deleteFeedback = (id) => api.delete(`/feedback/${id}`);

// ==================== 시스템 상태 ====================
export const getSystemStatus = () => api.get('/system-status');
export const getSystemStatusSummary = () => api.get('/system-status/summary');
export const getSystemStatusTimeline = () => api.get('/system-status/timeline');
export const createSystemStatusSnapshot = (data) => api.post('/system-status', data);

// ==================== 파이프라인 타임라인 ====================
export const getPipelineTimeline = () => api.get('/pipelines/timeline');

// ==================== 결과 테이블 편집 ====================
export const updateResultTable = (id, data) => api.put(`/results/${id}/table`, data);

// ==================== 파일 다운로드 ====================
export const downloadResultJsonl = (id, params = {}) =>
  api.get(`/results/${id}/download/jsonl`, { params, responseType: 'blob' });

// ==================== QA 문서 (QA Documents) ====================
// QA 결과 목록 조회 (로컬 파일 결과와 QA 문서 정보 포함)
export const getQaResults = () => api.get('/qa');
// QA 결과 상세 조회
export const getQaResult = (resultId) => api.get(`/qa/results/${resultId}`);
// QA 문서 조회 (결과 ID로)
export const getQaDocumentByResultId = (resultId) => api.get(`/qa/results/${resultId}/document`);
// QA 문서 생성
export const createQaDocument = (data) => api.post('/qa', data);
// QA 문서 수정
export const updateQaDocument = (id, data) => api.put(`/qa/${id}`, data);
export const deleteQaDocument = (id) => api.delete(`/qa/${id}`);
// QA 상태 업데이트
export const updateQaStatus = (resultId, data) => api.put(`/qa/results/${resultId}/status`, data);
// 코멘트
export const getQaComments = (resultId) => api.get(`/qa/results/${resultId}/comments`);
export const createQaComment = (resultId, data) => api.post(`/qa/results/${resultId}/comments`, data);

export default api;

