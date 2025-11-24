/**
* @ClassName	: api.js
* @Description	: Axios 기반 API 유틸리티, 백엔드 API 호출 및 공통 에러 처리
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - Axios 인스턴스 생성 및 인터셉터 설정
* 								- 요청/응답 인터셉터를 통한 공통 처리
* 								- QA 파일 관리, 로컬 파일, 결과 등 API 함수 제공
*/
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
      // 409 에러 (중복 파일)
      else if (status === 409) {
        console.error('중복 파일:', data.message || '이미 업로드한 파일입니다.');
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

// ==================== QA 파일 관리 (QA File Management) ====================

/**
 * 워크스페이스 목록 조회
 * after/before/dev 각각의 페이지 정보를 포함한 폴더 상태 반환
 *
 * @param {Object} params
 * @param {number} params.afterPage
 * @param {number} params.beforePage
 * @param {number} params.devPage
 * @param {number} params.size
 */
export const getQaWorkspace = ({
  afterPage = 0,
  beforePage = 0,
  devPage = 0,
  size = 5,
} = {}) =>
  api.get('/qa/workspace', {
    params: {
      afterPage,
      beforePage,
      devPage,
      size,
    },
  });

/**
 * HTML 파일 업로드 (before 폴더)
 *
 * @param {File} file - 업로드할 HTML 파일 (.html, .htm)
 * @param {Object} config - 추가 설정 옵션
 * @returns {Promise<AxiosResponse>} 업로드된 파일 메타데이터
 */
export const uploadQaHtmlFile = (file, config = {}) => {
  if (!file) {
    return Promise.reject(new Error('업로드할 파일이 필요합니다.'));
  }

  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    ...(config.headers || {}),
    'Content-Type': 'multipart/form-data',
  };

  return api.post('/qa/files/html', formData, {
    ...config,
    headers,
  });
};

/**
 * HTML 파일 내용 조회
 *
 * @param {'after'|'before'|'dev'} folder
 * @param {string} fileName
 */
export const getQaFileContent = (folder, fileName) => {
  if (!folder || !fileName) {
    return Promise.reject(new Error('folder와 fileName이 필요합니다.'));
  }
  const safeFolder = encodeURIComponent(folder);
  const safeFileName = encodeURIComponent(fileName);
  return api.get(`/qa/files/${safeFolder}/${safeFileName}`);
};

/**
 * before 폴더 HTML 저장
 *
 * @param {string} fileName - 파일명
 * @param {string} htmlContent - 저장할 HTML 문자열
 */
export const saveBeforeHtmlFile = (fileName, htmlContent) => {
  if (!fileName) {
    return Promise.reject(new Error('fileName이 필요합니다.'));
  }
  const safeFileName = encodeURIComponent(fileName);
  return api.put(`/qa/files/before/${safeFileName}`, { htmlContent });
};

/**
 * JSONL 변환 (after 폴더에 저장)
 *
 * @param {Object} data - HtmlUpdateRequest 형태의 payload
 */
export const convertHtmlToJsonl = (data) =>
  api.post('/qa/convert/jsonl', data);

/**
 * after → dev 승격
 *
 * @param {string} fileName - 승격할 JSONL 파일명
 */
export const promoteAfterFile = (fileName) =>
  api.post('/qa/files/after/promote', { fileName });

export default api;

