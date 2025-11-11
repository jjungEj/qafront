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

// ==================== 시스템 상태 ====================
export const getSystemStatus = () => api.get('/system-status');

// ==================== 모델 (Models) ====================
export const getModels = () => api.get('/models');
export const getModel = (id) => api.get(`/models/${id}`);
export const createModel = (data) => api.post('/models', data);
export const updateModel = (id, data) => api.put(`/models/${id}`, data);
export const deleteModel = (id) => api.delete(`/models/${id}`);

// ==================== 파이프라인 (Pipelines) ====================
export const getPipelines = (modelId = null) => {
  const params = modelId ? { modelId } : {};
  return api.get('/pipelines', { params });
};
export const getPipeline = (id) => api.get(`/pipelines/${id}`);
export const createPipeline = (data) => api.post('/pipelines', data);
export const updatePipeline = (id, data) => api.put(`/pipelines/${id}`, data);
export const deletePipeline = (id) => api.delete(`/pipelines/${id}`);

// ==================== 결과 (Results) ====================
export const getResults = (pipelineId = null) => {
  const params = pipelineId ? { pipelineId } : {};
  return api.get('/results', { params });
};
export const getResult = (id) => api.get(`/results/${id}`);
export const createResult = (data) => api.post('/results', data);
export const updateResult = (id, data) => api.put(`/results/${id}`, data);
export const deleteResult = (id) => api.delete(`/results/${id}`);

// ==================== 피드백 (Feedback) ====================
export const getFeedbacks = (resultId = null) => {
  const params = resultId ? { resultId } : {};
  return api.get('/feedback', { params });
};
export const getFeedback = (id) => api.get(`/feedback/${id}`);
export const createFeedback = (data) => api.post('/feedback', data);
export const updateFeedback = (id, data) => api.put(`/feedback/${id}`, data);
export const deleteFeedback = (id) => api.delete(`/feedback/${id}`);

export default api;

