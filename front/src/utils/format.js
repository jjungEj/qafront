/**
* @ClassName	: format.js
* @Description	: 데이터 포맷팅 유틸리티 함수, 파일 크기, 날짜/시간, 처리 시간 포맷팅
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - 파일 크기 포맷팅 (B, KB, MB)
* 								- 날짜/시간 포맷팅 함수
* 								- 처리 시간 계산 및 포맷팅
*/

/**
 * 파일 크기 포맷팅
 * @param {number} bytes - 바이트 단위 크기
 * @returns {string} 포맷팅된 파일 크기
 */
export function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

/**
 * 날짜/시간 포맷팅
 * @param {string|Date} dateTime - 날짜/시간 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜/시간
 */
export function formatDateTime(dateTime) {
  if (!dateTime) return '-';
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateTime;
  }
}

/**
 * 날짜/시간 포맷팅 (초 제외)
 * @param {string|Date} dateTime - 날짜/시간 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜/시간 (초 제외)
 */
export function formatDateTimeWithoutSeconds(dateTime) {
  if (!dateTime) return '-';
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTime;
  }
}

/**
 * 날짜만 포맷팅 (시간 제외)
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜
 */
export function formatDate(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return date;
  }
}

/**
 * 처리 시간 계산 (시작일시 - 종료일시)
 * @param {string|Date} startedAt - 시작일시
 * @param {string|Date} finishedAt - 종료일시
 * @returns {string} 처리 시간 (예: "10초", "1분 30초")
 */
export function formatProcessingTime(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return '-';
  try {
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const diff = Math.floor((end - start) / 1000); // 초 단위
    
    if (diff < 60) {
      return `${diff}초`;
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
    } else {
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    }
  } catch {
    return '-';
  }
}

