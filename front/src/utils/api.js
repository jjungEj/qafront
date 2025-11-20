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
 * 파일 업로드 및 저장
 * 엑셀 파일(xlsx, xls, csv)을 업로드하고 HTML로 변환하여 DB에 저장
 * 
 * @param {File} file - 업로드할 엑셀 파일
 * @param {Object} config - 추가 설정 옵션 (headers 등)
 * @returns {Promise<AxiosResponse>} 업로드된 파일 정보
 *   - id: 파일 ID
 *   - fileName: 파일명
 *   - fileSize: 파일 크기
 *   - fileType: 파일 타입
 *   - sheets: 시트 정보 배열
 * 
 * @throws {Error} 파일이 없거나 지원하지 않는 형식인 경우
 * 
 * @example
 * const file = document.querySelector('input[type="file"]').files[0];
 * const response = await uploadQaFile(file);
 * console.log(response.data.sheets); // [{ sheetName, htmlContent }, ...]
 */
export const uploadQaFile = (file, config = {}) => {
  if (!file) {
    return Promise.reject(new Error('업로드할 파일이 필요합니다.'));
  }

  // FormData 생성 (multipart/form-data 형식)
  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    ...(config.headers || {}),
    'Content-Type': 'multipart/form-data', // 파일 업로드를 위한 Content-Type
  };

  return api.post('/qa/upload', formData, {
    ...config,
    headers,
  });
};

/**
 * HTML 파일 업로드
 * 
 * @param {File} file - 업로드할 HTML 파일 (.html, .htm)
 * @param {Object} config - 추가 설정 옵션
 * @returns {Promise<AxiosResponse>} 업로드된 파일 정보
 * @throws {Error} 중복 파일인 경우 409 상태 코드와 함께 에러 반환
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

  return api.post('/qa/upload/html', formData, {
    ...config,
    headers,
  });
};

/**
 * 다중 파일 업로드
 * 여러 파일을 동시에 업로드 (엑셀/CSV 및 HTML 파일 모두 지원)
 * 
 * @param {File[]} files - 업로드할 파일 배열
 * @param {Object} config - 추가 설정 옵션
 * @returns {Promise<AxiosResponse>} 업로드 결과
 *   - successFiles: 성공적으로 업로드된 파일 목록
 *   - duplicateFiles: 중복된 파일 목록 [{ fileName, message }]
 *   - errorFiles: 오류가 발생한 파일 목록 [{ fileName, errorMessage }]
 * 
 * @example
 * const files = Array.from(fileInput.files);
 * const response = await uploadQaFilesMultiple(files);
 * const { successFiles, duplicateFiles, errorFiles } = response.data;
 */
export const uploadQaFilesMultiple = (files, config = {}) => {
  if (!files || files.length === 0) {
    return Promise.reject(new Error('업로드할 파일이 필요합니다.'));
  }

  const formData = new FormData();
  // 여러 파일을 files 키로 추가
  files.forEach(file => {
    formData.append('files', file);
  });

  const headers = {
    ...(config.headers || {}),
    'Content-Type': 'multipart/form-data',
  };

  return api.post('/qa/upload/multiple', formData, {
    ...config,
    headers,
  });
};

/**
 * 페이징된 파일 목록 조회
 * 
 * @param {number} page - 페이지 번호 (0부터 시작, 기본값: 0)
 * @param {number} size - 페이지 크기 (기본값: 10)
 * @returns {Promise<AxiosResponse>} 페이징된 파일 목록
 *   - content: 파일 목록 배열
 *   - page: 현재 페이지 번호
 *   - size: 페이지 크기
 *   - totalElements: 전체 파일 개수
 *   - totalPages: 전체 페이지 수
 *   - hasNext: 다음 페이지 존재 여부
 *   - hasPrevious: 이전 페이지 존재 여부
 * 
 * @example
 * const response = await getQaFilesPaged(0, 10);
 * const { content, totalElements, totalPages } = response.data;
 */
export const getQaFilesPaged = (page = 0, size = 10) => 
  api.get('/qa/files/paged', { params: { page, size } });

/**
 * 파일 검색
 * 파일명으로 파일을 검색 (페이징 지원)
 * 
 * @param {string} keyword - 검색어 (파일명에 포함된 문자열)
 * @param {number} page - 페이지 번호 (기본값: 0)
 * @param {number} size - 페이지 크기 (기본값: 10)
 * @returns {Promise<AxiosResponse>} 페이징된 검색 결과
 *   - content: 검색된 파일 목록 배열
 *   - page: 현재 페이지 번호
 *   - size: 페이지 크기
 *   - totalElements: 전체 검색 결과 개수
 *   - totalPages: 전체 페이지 수
 *   - hasNext: 다음 페이지 존재 여부
 *   - hasPrevious: 이전 페이지 존재 여부
 * 
 * @example
 * const response = await searchQaFiles('example', 0, 10);
 * const { content, totalElements } = response.data;
 */
export const searchQaFiles = (keyword, page = 0, size = 10) => 
  api.get('/qa/files/search', { params: { keyword, page, size } });

/**
 * 파일 상세 조회
 * 특정 파일의 상세 정보와 모든 시트의 HTML 내용을 조회
 * 
 * @param {number} id - 파일 ID
 * @returns {Promise<AxiosResponse>} 파일 상세 정보
 *   - id, fileName, fileSize, fileType, feedback
 *   - sheets: [{ id, sheetName, sheetOrder, htmlContent }, ...]
 * 
 * @throws {Error} 파일을 찾을 수 없으면 404 에러
 */
export const getQaFileDetail = (id) => api.get(`/qa/files/${id}`);

/**
 * 피드백 저장
 * 파일의 확인 사항(피드백)을 저장
 * 
 * @param {number} id - 파일 ID
 * @param {string} feedback - 피드백 내용
 * @returns {Promise<AxiosResponse>} 업데이트된 파일 정보
 * 
 * @throws {Error} 피드백이 비어있으면 400 에러, 파일을 찾을 수 없으면 404 에러
 */
export const saveQaFileFeedback = (id, feedback) => 
  api.put(`/qa/files/${id}/feedback`, { feedback });

/**
 * JSONL 변환
 * 수정된 HTML을 JSONL 형식으로 변환하여 다운로드
 * 
 * @param {Object} data - 변환할 데이터
 *   - fileName: 파일명
 *   - sheets: [{ sheetName, htmlContent, imageBase64 }, ...]
 * @returns {Promise<AxiosResponse>} JSONL 파일 (Blob)
 * 
 * 응답 형식:
 * - Content-Type: application/octet-stream
 * - Body: JSONL 파일 바이너리
 * 
 * JSONL 형식: 각 줄은 {"image":"", "html":"<table>...</table>"} 형식
 */
export const convertQaFileToJsonl = (data) => 
  api.post('/qa/convert/jsonl', data, { responseType: 'blob' });

/**
 * 편집된 시트 저장
 * 수정된 HTML 내용을 서버에 저장
 * 
 * @param {number} id - 파일 ID
 * @param {Array} sheets - 저장할 시트 배열 [{ id, htmlContent }, ...]
 * @returns {Promise<AxiosResponse>} 업데이트된 파일 정보
 * 
 * @throws {Error} 파일을 찾을 수 없으면 404 에러
 */
export const saveQaFileSheets = (id, sheets) => 
  api.put(`/qa/files/${id}/sheets`, { sheets });

/**
 * 파일 삭제
 * 
 * @param {number} id - 파일 ID
 * @returns {Promise<AxiosResponse>} 삭제 성공 응답
 * 
 * @throws {Error} 파일을 찾을 수 없으면 404 에러
 */
export const deleteQaFile = (id) => 
  api.delete(`/qa/files/${id}`);

export default api;

