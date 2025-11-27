/**
* @ClassName	: QA.js
* @Description	: QA 워크스페이스 페이지, 폴더별 파일 목록/편집/승격 기능 제공
* @Author		: 정은주
* @Date			: 2025.11.17
* ===========================================================
* DATE              AUTHOR             NOTE
* -----------------------------------------------------------
* 2025.11.17        정은주        - QA 파일 목록 조회 및 표시
* 2025.11.24        개편          - 워크스페이스 기반 목록/페이징, HTML 편집/승격
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  getQaWorkspace,
  uploadQaHtmlFile,
  getQaFileContent,
  saveBeforeHtmlFile,
  convertHtmlToJsonl,
  promoteAfterFile,
  startInferenceResultJob,
} from '../utils/api';
import { formatDateTime, formatDateTimeWithoutSeconds, formatFileSize } from '../utils/format';
import { NotificationContainer } from '../components/Notification';
import './Page.css';
import './QADetail.css';

const DEFAULT_PAGE_SIZE = 5;
const FOLDER_LABELS = {
  after: 'After',
  before: 'Before',
  dev: 'Dev',
};
const ALL_FOLDER_KEYS = ['after', 'before', 'dev'];

const createFolderState = () => ({
  files: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  totalElements: 0,
});

const TABLE_STYLE_ID = 'qa-table-border-style';
const TABLE_STYLE_RULES = [
  '  table { border-collapse: collapse; }',
  '  th, td { border: 1px solid #000000; }',
  '  h2 { margin-top: 30px; margin-bottom: 10px; }',
].join('\n');
const TABLE_DEFAULT_ATTRIBUTES = Object.freeze({
  border: '1',
  cellspacing: '0',
  cellpadding: '6',
});
const BASE_TABLE_STYLE_BLOCK = [
  '<style>',
  TABLE_STYLE_RULES,
  '</style>',
].join('\n');
const TABLE_STYLE_REGEX = new RegExp(
  `<style[^>]*id=["']${TABLE_STYLE_ID}["'][^>]*>[\\s\\S]*?<\\/style>`,
  'i'
);
const BASE_TABLE_STYLE_REGEX = /<style[^>]*>\s*table\s*\{\s*border-collapse:\s*collapse;?\s*\}\s*th,\s*td\s*\{\s*border:\s*1px\s*solid\s*#000000;?\s*\}\s*h2\s*\{\s*margin-top:\s*30px;?\s*margin-bottom:\s*10px;?\s*\}\s*<\/style>/gi;
const TITLE_TAG_REGEX = /<title[\s\S]*?<\/title>/gi;
const META_CHARSET_REGEX = /<meta[^>]*charset[^>]*>/gi;
const META_VIEWPORT_REGEX = /<meta[^>]*name=["']viewport["'][^>]*>/gi;
const DOCTYPE_REGEX = /<!DOCTYPE[^>]*>/gi;
const HTML_TAG_REGEX = /<html([^>]*)>/i;
const BODY_TAG_REGEX = /<body([^>]*)>/i;
const HEAD_TAG_REGEX = /<head[^>]*>([\s\S]*?)<\/head>/i;
const BODY_CONTENT_REGEX = /<body[^>]*>([\s\S]*?)<\/body>/i;
const DEFAULT_HTML_LANG = 'ko';
const DEFAULT_HTML_TITLE = 'Tables';

const normalizeHtmlForTransport = (rawHtml = '') => {
  if (typeof rawHtml !== 'string') {
    return '';
  }
  return rawHtml.replace(/\r/g, '').replace(/\n/g, '');
};

const applyDefaultTableAttributes = (html = '') => {
  const source = typeof html === 'string' ? html : '';
  if (!source.trim() || !/<table/i.test(source)) {
    return source;
  }

  const hasHtmlWrapper = HTML_TAG_REGEX.test(source);
  const hasDoctype = DOCTYPE_REGEX.test(source);
  const applyAttributes = (tables) => {
    tables.forEach((table) => {
      Object.entries(TABLE_DEFAULT_ATTRIBUTES).forEach(([attr, value]) => {
        if (table.getAttribute(attr) !== value) {
          table.setAttribute(attr, value);
        }
      });
    });
  };

  try {
    if (hasHtmlWrapper) {
      if (typeof DOMParser === 'undefined') {
        return source;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(source, 'text/html');
      const tables = doc.querySelectorAll('table');
      if (tables.length === 0) {
        return source;
      }
      applyAttributes(tables);
      const serialized = doc.documentElement?.outerHTML || source;
      return hasDoctype ? `<!DOCTYPE html>\n${serialized}` : serialized;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return source;
    }
    const container = document.createElement('div');
    container.innerHTML = source;
    const tables = container.querySelectorAll('table');
    if (tables.length === 0) {
      return source;
    }
    applyAttributes(tables);
    return container.innerHTML;
  } catch (error) {
    console.warn('applyDefaultTableAttributes error:', error);
    return source;
  }
};

const stripTableStyleBlocks = (html = '') => {
  if (!html) return '';
  return html
    .replace(TABLE_STYLE_REGEX, '')
    .replace(BASE_TABLE_STYLE_REGEX, '')
    .trim();
};

const extractHeadContent = (html = '') => {
  const match = html.match(HEAD_TAG_REGEX);
  if (!match) {
    return '';
  }
  return match[1]?.trim() || '';
};

const extractBodyAttributes = (html = '') => {
  const match = html.match(BODY_TAG_REGEX);
  return match && match[1] ? match[1].trim() : '';
};

const extractHtmlAttributes = (html = '') => {
  const match = html.match(HTML_TAG_REGEX);
  return match && match[1] ? match[1].trim() : '';
};

const stripHeadMetaAndTitle = (headHtml = '') => {
  if (!headHtml) {
    return '';
  }
  return headHtml
    .replace(TITLE_TAG_REGEX, '')
    .replace(META_CHARSET_REGEX, '')
    .replace(META_VIEWPORT_REGEX, '')
    .trim();
};

const extractBodyContent = (html = '') => {
  if (!html) {
    return '';
  }
  const bodyMatch = html.match(BODY_CONTENT_REGEX);
  if (bodyMatch) {
    return bodyMatch[1]?.trim() || '';
  }
  const htmlMatch = html.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
  if (htmlMatch) {
    const withoutHead = htmlMatch[1].replace(HEAD_TAG_REGEX, '');
    return withoutHead.trim();
  }
  return html.replace(DOCTYPE_REGEX, '').trim();
};

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getHtmlTitle = (fileName = '') => {
  const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : '';
  const resolved = baseName?.trim() || DEFAULT_HTML_TITLE;
  return resolved;
};

const getJsonlTitle = (fileName = '') => `${getHtmlTitle(fileName)}.jsonl`;

const buildFullHtmlDocument = (html = '', { title } = {}) => {
  const headContent = stripTableStyleBlocks(stripHeadMetaAndTitle(extractHeadContent(html)));
  const bodyContent = stripTableStyleBlocks(extractBodyContent(html));
  const htmlAttributes = extractHtmlAttributes(html);
  const bodyAttributes = extractBodyAttributes(html);
  const hasLang = /lang\s*=/.test(htmlAttributes || '');
  const htmlAttrParts = [];
  if (htmlAttributes) {
    htmlAttrParts.push(htmlAttributes);
  }
  if (!hasLang) {
    htmlAttrParts.push(`lang="${DEFAULT_HTML_LANG}"`);
  }
  const htmlOpenTag = htmlAttrParts.length > 0
    ? `<html ${htmlAttrParts.join(' ')}>`
    : `<html lang="${DEFAULT_HTML_LANG}">`;
  const bodyOpenTag = bodyAttributes ? `<body ${bodyAttributes}>` : '<body>';
  const sanitizedHeadSegments = [
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${escapeHtml(title?.trim() || DEFAULT_HTML_TITLE)}</title>`,
    BASE_TABLE_STYLE_BLOCK,
  ];
  if (headContent) {
    sanitizedHeadSegments.push(headContent);
  }
  sanitizedHeadSegments.push('</head>');
  return [
    '<!DOCTYPE html>',
    htmlOpenTag,
    sanitizedHeadSegments.join('\n'),
    bodyOpenTag,
    bodyContent,
    '</body>',
    '</html>',
  ].join('\n');
};

const ensureTableBorderStyles = (html = '') => {
  const source = typeof html === 'string' ? html : '';
  const withDefaultAttributes = applyDefaultTableAttributes(source);
  const cleanedSource = withDefaultAttributes.replace(TABLE_STYLE_REGEX, '');

  if (!cleanedSource.trim()) {
    return BASE_TABLE_STYLE_BLOCK;
  }

  if (BASE_TABLE_STYLE_REGEX.test(cleanedSource)) {
    return cleanedSource;
  }

  if (/<head[^>]*>/i.test(cleanedSource) && /<\/head>/i.test(cleanedSource)) {
    return cleanedSource.replace(/<\/head>/i, `${BASE_TABLE_STYLE_BLOCK}\n</head>`);
  }

  if (/<body[^>]*>/i.test(cleanedSource)) {
    return cleanedSource.replace(/<body[^>]*>/i, (match) => `${match}\n${BASE_TABLE_STYLE_BLOCK}`);
  }

  if (/<html[^>]*>/i.test(cleanedSource)) {
    return cleanedSource.replace(
      /<html[^>]*>/i,
      (match) => `${match}\n<head>${BASE_TABLE_STYLE_BLOCK}</head>`
    );
  }

  return `${BASE_TABLE_STYLE_BLOCK}\n${cleanedSource}`;
};

const buildStandardizedHtmlDocument = (html = '', { title } = {}) => {
  const htmlWithStyles = ensureTableBorderStyles(html || '');
  return buildFullHtmlDocument(htmlWithStyles, { title });
};

// 테이블 편집 유틸리티 함수들
const buildTableCellMaps = (tableElement, { assignDataset = false, tableIndex = 0 } = {}) => {
  if (!tableElement) {
    return {
      coordinateMap: new Map(),
      cellMetaMap: new Map(),
      matrix: []
    };
  }

  const rows = Array.from(tableElement.querySelectorAll('tr'));
  const matrix = [];
  const coordinateMap = new Map();
  const cellMetaMap = new Map();

  rows.forEach((row, rowIndex) => {
    matrix[rowIndex] = matrix[rowIndex] || [];
    let colPointer = 0;

    Array.from(row.cells).forEach((cell) => {
      while (matrix[rowIndex][colPointer]) {
        colPointer++;
      }

      const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
      const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

      for (let r = 0; r < rowspan; r++) {
        const targetRow = rowIndex + r;
        matrix[targetRow] = matrix[targetRow] || [];
        for (let c = 0; c < colspan; c++) {
          matrix[targetRow][colPointer + c] = cell;
        }
      }

      const meta = {
        rowIndex,
        colIndex: colPointer,
        rowspan,
        colspan
      };

      coordinateMap.set(cell, { rowIndex, colIndex: colPointer });
      cellMetaMap.set(cell, meta);

      if (assignDataset && cell.dataset) {
        cell.dataset.rowIndex = String(rowIndex);
        cell.dataset.colIndex = String(colPointer);
        cell.dataset.tableIndex = String(tableIndex);
      }

      colPointer += colspan;
    });
  });

  return { coordinateMap, cellMetaMap, matrix };
};

const findCellByCoordinates = (matrix, rowIndex, colIndex) => {
  if (rowIndex < 0 || colIndex < 0) return null;
  return matrix[rowIndex]?.[colIndex] || null;
};

const QA = () => {
  const [workspace, setWorkspace] = useState({
    after: createFolderState(),
    before: createFolderState(),
    dev: createFolderState(),
  });
  const [pages, setPages] = useState({ after: 0, before: 0, dev: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [beforeSearchInput, setBeforeSearchInput] = useState('');
  const [activeBeforeKeyword, setActiveBeforeKeyword] = useState(null);
  const [selectedBeforeFile, setSelectedBeforeFile] = useState(null);
  const [beforeHtml, setBeforeHtml] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [isFetchingBeforeFile, setIsFetchingBeforeFile] = useState(false);
  const [isSavingBeforeHtml, setIsSavingBeforeHtml] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedAfterFiles, setSelectedAfterFiles] = useState([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [pendingSelectBeforeFileName, setPendingSelectBeforeFileName] = useState(null);
  const [loadingFolders, setLoadingFolders] = useState({
    after: false,
    before: false,
    dev: false,
  });
  
  // 테이블 편집 관련 state
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const editingCellRef = useRef(null);
  const tableContainerRef = useRef(null);
  const sheetContentRef = useRef(null);

  const getEditableTables = useCallback(() => {
    if (!tableContainerRef.current) {
      return [];
    }
    return Array.from(tableContainerRef.current.querySelectorAll('table'));
  }, []);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const normalizeFolder = (folderData = {}) => {
    // folderData가 null이거나 undefined인 경우 빈 객체로 처리
    if (!folderData || typeof folderData !== 'object') {
      console.warn('normalizeFolder: folderData is invalid', folderData);
      return createFolderState();
    }
    
    // Spring Page 응답 구조 지원: content 배열 또는 files 배열
    let files = [];
    if (Array.isArray(folderData.content)) {
      files = [...folderData.content];
    } else if (Array.isArray(folderData.files)) {
      files = [...folderData.files];
    } else if (Array.isArray(folderData)) {
      // folderData 자체가 배열인 경우
      files = [...folderData];
    }
    
    // 날짜 기준 내림차순 정렬 (최신이 먼저)
    files.sort((a, b) => {
      const timeA = a?.lastModifiedAt ? new Date(a.lastModifiedAt).getTime() : 0;
      const timeB = b?.lastModifiedAt ? new Date(b.lastModifiedAt).getTime() : 0;
      return timeB - timeA;
    });
    
    const normalized = {
      files,
      page: folderData.number !== undefined ? folderData.number : (folderData.page !== undefined ? folderData.page : 0),
      size: folderData.size !== undefined ? folderData.size : DEFAULT_PAGE_SIZE,
      totalPages: folderData.totalPages !== undefined ? folderData.totalPages : 0,
      totalElements: folderData.totalElements !== undefined ? folderData.totalElements : files.length,
    };
    
    console.log('Normalized folder:', normalized);
    return normalized;
  };

  const fetchWorkspace = useCallback(
    async (override = {}) => {
      const {
        folderKeys = ALL_FOLDER_KEYS,
        beforeKeyword: overrideBeforeKeyword,
        size: overrideSize,
        ...pageOverrides
      } = override;

      const resolvedFolderKeys =
        Array.isArray(folderKeys) && folderKeys.length > 0 ? folderKeys : ALL_FOLDER_KEYS;

      const params = {
        afterPage: pageOverrides.afterPage ?? pages.after,
        beforePage: pageOverrides.beforePage ?? pages.before,
        devPage: pageOverrides.devPage ?? pages.dev,
        size: overrideSize ?? DEFAULT_PAGE_SIZE,
      };

      const resolvedBeforeKeyword =
        overrideBeforeKeyword !== undefined ? overrideBeforeKeyword : (activeBeforeKeyword || null);
      if (resolvedBeforeKeyword && typeof resolvedBeforeKeyword === 'string' && resolvedBeforeKeyword.trim()) {
        params.beforeKeyword = resolvedBeforeKeyword.trim();
      }

      setLoadingWorkspace(true);
      setLoadingFolders((prev) => {
        const next = { ...prev };
        resolvedFolderKeys.forEach((key) => {
          if (next[key] !== undefined) {
            next[key] = true;
          }
        });
        return next;
      });

      try {
        const response = await getQaWorkspace(params);
        let data = response.data || {};
        
        // 응답이 래핑되어 있는 경우 처리 (예: { data: { after: ... } })
        if (data.data && typeof data.data === 'object') {
          data = data.data;
        }
        
        // 디버깅: 응답 데이터 구조 확인
        console.log('Workspace API Response:', response);
        console.log('Response data:', data);
        
        // 백엔드 응답이 배열인 경우 객체로 변환
        let folderData = {};
        if (Array.isArray(data)) {
          // 배열 형태: [{ folder: "after", files: [...] }, ...]
          data.forEach((item) => {
            if (item.folder) {
              folderData[item.folder] = item;
            }
          });
        } else if (typeof data === 'object') {
          // 객체 형태: { after: {...}, before: {...}, dev: {...} }
          folderData = data;
        }
        
        console.log('After folder:', folderData.after);
        console.log('Before folder:', folderData.before);
        console.log('Dev folder:', folderData.dev);
        
        // 각 폴더 데이터가 없을 경우 빈 상태로 초기화
        const normalized = {
          after: normalizeFolder(folderData.after || folderData.afterFolder || null),
          before: normalizeFolder(folderData.before || folderData.beforeFolder || null),
          dev: normalizeFolder(folderData.dev || folderData.devFolder || null),
        };
        
        console.log('Normalized workspace:', normalized);
        console.log('Before files count:', normalized.before.files.length);
        console.log('After files count:', normalized.after.files.length);
        console.log('Dev files count:', normalized.dev.files.length);
        
        setWorkspace(normalized);
        setPages({
          after: normalized.after.page,
          before: normalized.before.page,
          dev: normalized.dev.page,
        });
        setSelectedAfterFiles((prev) =>
          prev.filter((fileName) =>
            normalized.after.files.some((file) => file.fileName === fileName)
          )
        );
        return normalized;
      } catch (error) {
        console.error('Workspace fetch error:', error);
        showNotification('워크스페이스를 불러오는데 실패했습니다.', 'error');
        throw error;
      } finally {
        setLoadingFolders((prev) => {
          const next = { ...prev };
          resolvedFolderKeys.forEach((key) => {
            if (next[key] !== undefined) {
              next[key] = false;
            }
          });
          return next;
        });
        setLoadingWorkspace(false);
      }
    },
    [pages.after, pages.before, pages.dev, activeBeforeKeyword, showNotification]
  );

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    let attempts = 0;
    const maxAttempts = 10;
    const mergeAttributes = (attrs = {}) => ({
      ...TABLE_DEFAULT_ATTRIBUTES,
      ...attrs,
    });
    const applyDefaultsToWysiwyg = () => {
      const tiny = window.tinymce;
      if (!tiny) {
        return false;
      }

      const patchEditorSettings = (editor) => {
        if (!editor) {
          return;
        }
        editor.settings = editor.settings || {};
        editor.settings.table_default_attributes = mergeAttributes(
          editor.settings.table_default_attributes || {}
        );
      };

      if (typeof tiny.init === 'function' && !tiny.__qaTableDefaultsPatched) {
        const originalInit = tiny.init.bind(tiny);
        tiny.init = (options = {}) =>
          originalInit({
            ...options,
            table_default_attributes: mergeAttributes(options.table_default_attributes || {}),
          });
        tiny.__qaTableDefaultsPatched = true;
      }

      if (Array.isArray(tiny.editors) && tiny.editors.length > 0) {
        tiny.editors.forEach(patchEditorSettings);
      } else if (tiny.activeEditor) {
        patchEditorSettings(tiny.activeEditor);
      }

      return true;
    };

    const intervalId = setInterval(() => {
      attempts += 1;
      if (applyDefaultsToWysiwyg() || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  const handleBeforeSearch = useCallback(() => {
    if (loadingFolders.before) {
      return;
    }
    const trimmed = beforeSearchInput.trim();
    const nextKeyword = trimmed.length > 0 ? trimmed : null;
    setActiveBeforeKeyword(nextKeyword);
    fetchWorkspace({
      beforePage: 0,
      beforeKeyword: nextKeyword,
      folderKeys: ['before'],
    });
  }, [beforeSearchInput, fetchWorkspace, loadingFolders.before]);

  const handleClearBeforeSearch = useCallback(() => {
    if (!beforeSearchInput && !activeBeforeKeyword) {
      return;
    }
    if (loadingFolders.before) {
      return;
    }
    setBeforeSearchInput('');
    setActiveBeforeKeyword(null);
    fetchWorkspace({
      beforePage: 0,
      beforeKeyword: null,
      folderKeys: ['before'],
    });
  }, [activeBeforeKeyword, beforeSearchInput, fetchWorkspace, loadingFolders.before]);

  useEffect(() => {
    if (!pendingSelectBeforeFileName) {
      return;
    }
    const match = workspace.before.files.find(
      (file) => file.fileName === pendingSelectBeforeFileName
    );
    if (match) {
      handleSelectBeforeFile(match);
      setPendingSelectBeforeFileName(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelectBeforeFileName, workspace.before.files]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const handleBeforeUploadChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const fileArray = Array.from(files);
    const fileCount = fileArray.length;
    showNotification(
      fileCount > 1
        ? `${fileCount}개 파일 업로드를 시작합니다.`
        : `"${fileArray[0]?.name}" 업로드를 시작합니다.`,
      'info',
      2000
    );
    setIsUploading(true);
    try {
      const response = await uploadQaHtmlFile(fileArray);
      
      // 응답이 배열인지 객체인지 확인
      const result = response.data;
      const uploadedFiles = Array.isArray(result) ? result : [result];
      const normalizedFiles = uploadedFiles.filter(Boolean);
      
      if (normalizedFiles.length === 1) {
        const uploadedFileName = normalizedFiles[0]?.fileName || fileArray[0].name;
        showNotification(`"${uploadedFileName}" 파일이 업로드되었습니다.`, 'success');
        setPendingSelectBeforeFileName(uploadedFileName);
      } else {
        showNotification(`${normalizedFiles.length}개 파일이 업로드되었습니다.`, 'success');
        // 다중 업로드 시 첫 번째 파일 선택
        if (normalizedFiles.length > 0 && normalizedFiles[0]?.fileName) {
          setPendingSelectBeforeFileName(normalizedFiles[0].fileName);
        }
      }
      
      await fetchWorkspace({ beforePage: 0, folderKeys: ['before'] });
    } catch (error) {
      const message = error.response?.data?.message || 'HTML 파일 업로드에 실패했습니다.';
      showNotification(
        fileCount > 1
          ? `${fileCount}개 파일 업로드 실패: ${message}`
          : message,
        'error',
        5000
      );
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSelectBeforeFile = async (file) => {
    if (!file) {
      setSelectedBeforeFile(null);
      setBeforeHtml('');
      setEditedHtml('');
      setIsEditingTable(false);
      setSelectedCells([]);
      setHistory([]);
      setHistoryIndex(-1);
      return;
    }
    setSelectedBeforeFile(file);
    setIsFetchingBeforeFile(true);
    try {
      const response = await getQaFileContent('before', file.fileName);
      console.log('File content response:', response);
      console.log('Response data:', response.data);
      
      // 다양한 응답 구조 지원
      const html = response.data?.htmlContent || response.data?.content || response.data?.html || response.data || '';
      const normalizedHtml = ensureTableBorderStyles(html || '');
      
      console.log('Extracted HTML length:', html.length);
      setBeforeHtml(normalizedHtml);
      setEditedHtml(normalizedHtml);
      
      // 히스토리 초기화
      setHistory([normalizedHtml]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
      setIsEditingTable(false);
      setSelectedCells([]);
      
      if (!html) {
        showNotification('HTML 내용이 비어있습니다.', 'warning');
      }
    } catch (error) {
      console.error('File content fetch error:', error);
      const message =
        error.response?.data?.message || `"${file.fileName}" 내용을 불러오지 못했습니다.`;
      showNotification(message, 'error');
      setBeforeHtml('');
      setEditedHtml('');
    } finally {
      setIsFetchingBeforeFile(false);
    }
  };

  const saveToHistory = useCallback((newHtml) => {
    setHistory(prevHistory => {
      const truncatedHistory = prevHistory.slice(0, historyIndexRef.current + 1);
      const updatedHistory = [...truncatedHistory, newHtml];
      historyIndexRef.current = updatedHistory.length - 1;
      setHistoryIndex(historyIndexRef.current);
      return updatedHistory;
    });
  }, []);

  const sanitizeHtmlElement = useCallback((element) => {
    if (!element) return null;
    const clonedElement = element.cloneNode(true);
    clonedElement.querySelectorAll('.selected').forEach((cell) => cell.classList.remove('selected'));
    clonedElement.querySelectorAll('.cell-editing').forEach((cell) => cell.classList.remove('cell-editing'));
    clonedElement.querySelectorAll('[contenteditable]').forEach((cell) => cell.removeAttribute('contenteditable'));
    return clonedElement;
  }, []);

  const getSanitizedHtmlSnapshot = useCallback(() => {
    if (!sheetContentRef.current) {
      return editedHtml;
    }
    const sanitizedWrapper = sanitizeHtmlElement(sheetContentRef.current);
    return sanitizedWrapper ? sanitizedWrapper.innerHTML : editedHtml;
  }, [editedHtml, sanitizeHtmlElement]);

  const updateHtmlFromTable = useCallback(() => {
    const sanitizedHtml = getSanitizedHtmlSnapshot();
    if (sanitizedHtml == null) {
      return null;
    }
    setEditedHtml(sanitizedHtml);
    saveToHistory(sanitizedHtml);
    return sanitizedHtml;
  }, [getSanitizedHtmlSnapshot, saveToHistory]);

  const handleSaveBeforeFile = async () => {
    if (!selectedBeforeFile) {
      return;
    }
    let latestHtml = editedHtml;
    // 편집 모드일 때 테이블에서 최신 HTML 가져오기
    if (isEditingTable) {
      const updatedHtml = updateHtmlFromTable();
      // 상태 업데이트를 기다리기 위해 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100));
      latestHtml = typeof updatedHtml === 'string' ? updatedHtml : (getSanitizedHtmlSnapshot() ?? editedHtml);
    } else {
      latestHtml = getSanitizedHtmlSnapshot() ?? editedHtml;
    }
    const htmlWithStyles = ensureTableBorderStyles(latestHtml || '');
    if (htmlWithStyles !== latestHtml) {
      setEditedHtml(htmlWithStyles);
      saveToHistory(htmlWithStyles);
      latestHtml = htmlWithStyles;
    }
    const htmlTitle = getHtmlTitle(selectedBeforeFile.fileName);
    const documentHtml = buildStandardizedHtmlDocument(latestHtml || '', { title: htmlTitle });
    const normalizedDocumentHtml = normalizeHtmlForTransport(documentHtml);
    setIsSavingBeforeHtml(true);
    try {
      await saveBeforeHtmlFile(selectedBeforeFile.fileName, normalizedDocumentHtml);
      showNotification('HTML 내용이 저장되었습니다.', 'success');
      await fetchWorkspace({ folderKeys: ['before'] });
      setBeforeHtml(normalizedDocumentHtml);
      if (normalizedDocumentHtml !== latestHtml) {
        setEditedHtml(normalizedDocumentHtml);
        saveToHistory(normalizedDocumentHtml);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'HTML 저장에 실패했습니다.';
      showNotification(message, 'error');
    } finally {
      setIsSavingBeforeHtml(false);
    }
  };

  const extractTableSectionsByHeading = (rootElement) => {
    if (!rootElement) return [];

    const sections = [];
    const usedTables = new Set();
    const headings = Array.from(rootElement.querySelectorAll('h2'));
    const allTables = Array.from(rootElement.querySelectorAll('table'));

    headings.forEach((heading) => {
      let sibling = heading.nextElementSibling;
      let nextTable = null;

      while (sibling) {
        if (sibling.tagName && sibling.tagName.toLowerCase() === 'table') {
          nextTable = sibling;
          break;
        }
        sibling = sibling.nextElementSibling;
      }

      if (!nextTable || usedTables.has(nextTable)) {
        return;
      }

      usedTables.add(nextTable);

      sections.push({
        title: (heading.textContent || '').trim(),
        fragmentHtml: `${heading.outerHTML}\n${nextTable.outerHTML}`,
      });
    });

    allTables
      .filter((table) => !usedTables.has(table))
      .forEach((table) => {
        sections.push({
          title: table.getAttribute('data-table-name')?.trim() || '',
          fragmentHtml: table.outerHTML,
        });
      });

    return sections;
  };

  // HTML 테이블을 이미지(base64)로 변환
  const convertTableToImage = async (htmlContent, sheetName) => {
    // 임시 DOM 요소 생성 (화면 밖에 배치)
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0px';
    tempDiv.style.width = '100%';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    
    // DOM 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tableElement = tempDiv.querySelector('table');
    
    if (!tableElement) {
      document.body.removeChild(tempDiv);
      console.error(`테이블 요소를 찾을 수 없습니다: ${sheetName}`);
      return null;
    }

    try {
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight,
      });

      const imageBase64 = canvas.toDataURL('image/png');
      document.body.removeChild(tempDiv);
      return imageBase64.split(',')[1]; // base64 부분만 추출
    } catch (error) {
      document.body.removeChild(tempDiv);
      console.error(`이미지 변환 실패 (${sheetName}):`, error);
      return null;
    }
  };

  /**
   * HTML을 JSONL로 변환
   * - HtmlUpdateRequest.sheets[].htmlContent 에 BEFORE HTML 전체를 그대로 전달
   * - 테이블 수만큼 imageBase64List 를 생성해 순서대로 첨부 (없으면 imageBase64 사용)
   * - 서버에서 테이블 단위 분할/매핑을 수행하므로 별도 파싱 불필요
   */
  const handleConvertToJsonl = async () => {
    if (!selectedBeforeFile) {
      return;
    }
    // 편집 모드일 때 테이블에서 최신 HTML 가져오기
    if (isEditingTable) {
      updateHtmlFromTable();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    setIsConverting(true);
    try {
      showNotification('이미지 변환 중...', 'info');
      
      const baseFileName = selectedBeforeFile.fileName.replace(/\.[^/.]+$/, '') || 'Sheet1';
      const htmlTitle = getHtmlTitle(selectedBeforeFile.fileName);
      let latestHtml = getSanitizedHtmlSnapshot() ?? editedHtml;
      const htmlWithStyles = ensureTableBorderStyles(latestHtml || '');
      if (htmlWithStyles !== latestHtml) {
        setEditedHtml(htmlWithStyles);
        saveToHistory(htmlWithStyles);
        latestHtml = htmlWithStyles;
      }
      const standardizedHtml = buildStandardizedHtmlDocument(latestHtml || '', { title: htmlTitle });
      const transportReadyHtml = normalizeHtmlForTransport(standardizedHtml);
      const sandbox = document.createElement('div');
      sandbox.innerHTML = standardizedHtml || '';
      const tables = Array.from(sandbox.querySelectorAll('table'));
      const tableSections = extractTableSectionsByHeading(sandbox).filter(
        (section) => section.fragmentHtml && /<table/i.test(section.fragmentHtml)
      );

      const sheets = [];

      for (let index = 0; index < tableSections.length; index++) {
        const section = tableSections[index];
        const fragmentHtml = section.fragmentHtml?.trim();
        if (!fragmentHtml) {
          continue;
        }
        const sectionTitle = section.title?.trim() || `${baseFileName}-Table${index + 1}`;
        const sectionDocumentHtml = buildStandardizedHtmlDocument(fragmentHtml, { title: sectionTitle });
        const normalizedSectionHtml = normalizeHtmlForTransport(sectionDocumentHtml);

        let sectionImageBase64 = await convertTableToImage(fragmentHtml, sectionTitle);
        if (!sectionImageBase64) {
          sectionImageBase64 = await convertTableToImage(sectionDocumentHtml, sectionTitle);
        }

        const sheetPayload = {
          sheetName: sectionTitle,
          htmlContent: normalizedSectionHtml,
        };

        if (sectionImageBase64) {
          sheetPayload.imageBase64List = [sectionImageBase64];
          sheetPayload.imageBase64 = sectionImageBase64;
        }

        sheets.push(sheetPayload);
      }

      if (sheets.length === 0) {
        const imageBase64List = [];

        for (let index = 0; index < tables.length; index++) {
          const table = tables[index];
          const tableWrapper = document.createElement('div');
          tableWrapper.style.backgroundColor = '#ffffff';
          tableWrapper.style.padding = '8px';
          const clonedTable = table.cloneNode(true);
          tableWrapper.appendChild(clonedTable);

          const tableHtml = tableWrapper.innerHTML.trim();
          if (!tableHtml) {
            continue;
          }

          const imageBase64 = await convertTableToImage(tableHtml, `${baseFileName}-Table${index + 1}`);
          if (imageBase64) {
            imageBase64List.push(imageBase64);
          }
        }

        const sheetPayload = {
          sheetName: baseFileName,
          htmlContent: transportReadyHtml,
        };

        if (imageBase64List.length > 0) {
          sheetPayload.imageBase64List = imageBase64List;
        } else {
          const fallbackImage = await convertTableToImage(standardizedHtml, baseFileName);
          if (fallbackImage) {
            sheetPayload.imageBase64 = fallbackImage;
          }
        }

        sheets.push(sheetPayload);
      }

      const validSheets = sheets.filter((sheet) => sheet.htmlContent?.trim());
      if (validSheets.length === 0) {
        showNotification('변환할 내용이 없습니다.', 'warning');
        return;
      }

      // API 요청 데이터 준비
      const payload = {
        fileName: selectedBeforeFile.fileName,
        sheets: validSheets,
      };

      await convertHtmlToJsonl(payload);

      const jsonlFileName = getJsonlTitle(selectedBeforeFile.fileName);
      showNotification(`JSONL 파일이 생성되어 After 폴더에 저장되었습니다: ${jsonlFileName} (${validSheets.length}개 시트)`, 'success');
      
      // after 폴더를 첫 페이지로 새로고침하여 새 파일 확인
      await fetchWorkspace({ afterPage: 0, folderKeys: ['after'] });
    } catch (error) {
      const message = error.response?.data?.message || 'JSONL 변환에 실패했습니다.';
      showNotification(message, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  // 셀 선택 시작
  const handleCellMouseDown = useCallback((e, tableIndex, rowIndex, colIndex) => {
    if (!isEditingTable) return;

    const cellElement = e.currentTarget || e.target;

    if (e.detail >= 2) {
      setIsSelecting(false);
      setSelectedCells([]);
      if (cellElement && cellElement.focus) {
        cellElement.focus();
      }
      return;
    }

    const activeEditable = document.activeElement;
    if (activeEditable && activeEditable.isContentEditable && activeEditable !== cellElement) {
      activeEditable.blur();
    }

    e.preventDefault();
    setIsSelecting(true);
    setSelectedCells([{ tableIndex, rowIndex, colIndex }]);
    
    if (cellElement && cellElement.scrollIntoView) {
      cellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isEditingTable]);

  // 셀 선택 중
  const handleCellMouseEnter = useCallback((e, tableIndex, rowIndex, colIndex) => {
    if (!isSelecting || !isEditingTable) return;

    const activeEditable = document.activeElement;
    if (activeEditable && activeEditable.isContentEditable) {
      return;
    }
    
    const cell = e.currentTarget || e.target;
    if (cell && cell.scrollIntoView) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    setSelectedCells(prev => {
      if (prev.length === 0) return prev;
      const startCell = prev[0];
      if (startCell.tableIndex !== tableIndex) {
        return prev;
      }
      const newSelectedCells = [];
      const startRow = Math.min(startCell.rowIndex, rowIndex);
      const endRow = Math.max(startCell.rowIndex, rowIndex);
      const startCol = Math.min(startCell.colIndex, colIndex);
      const endCol = Math.max(startCell.colIndex, colIndex);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelectedCells.push({ tableIndex, rowIndex: r, colIndex: c });
        }
      }

      return newSelectedCells;
    });
  }, [isSelecting, isEditingTable]);

  // 셀 선택 종료
  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const previousHtml = history[prevIndex];
      setHistoryIndex(prevIndex);
      historyIndexRef.current = prevIndex;
      setEditedHtml(previousHtml);
      setSelectedCells([]);
      showNotification('이전 상태로 되돌렸습니다.', 'success');
    } else {
      showNotification('더 이상 되돌릴 수 없습니다.', 'warning');
    }
  }, [historyIndex, history, showNotification]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextHtml = history[nextIndex];
      setHistoryIndex(nextIndex);
      historyIndexRef.current = nextIndex;
      setEditedHtml(nextHtml);
      setSelectedCells([]);
      showNotification('다음 상태로 이동했습니다.', 'success');
    } else {
      showNotification('더 이상 앞으로 갈 수 없습니다.', 'warning');
    }
  }, [historyIndex, history, showNotification]);

  // 셀 병합
  const handleMergeCells = useCallback(() => {
    if (selectedCells.length < 2) {
      showNotification('병합할 셀을 2개 이상 선택해주세요.', 'warning');
      return;
    }

    const normalizedCells = selectedCells.map((cell) => ({
      ...cell,
      tableIndex: typeof cell.tableIndex === 'number' ? cell.tableIndex : 0,
    }));

    const uniqueTableIndexes = new Set(normalizedCells.map((cell) => cell.tableIndex));
    if (uniqueTableIndexes.size !== 1) {
      showNotification('서로 다른 테이블의 셀은 함께 병합할 수 없습니다.', 'warning');
      return;
    }

    const targetTableIndex = normalizedCells[0]?.tableIndex ?? 0;

    const parser = new DOMParser();
    const doc = parser.parseFromString(editedHtml, 'text/html');
    const docTables = doc.querySelectorAll('table');
    const docTable = docTables[targetTableIndex] || docTables[0];
    if (!docTable) return;

    const { matrix, cellMetaMap } = buildTableCellMaps(docTable);

    const sortedCells = [...normalizedCells].sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.colIndex - b.colIndex;
    });

    const selectedCellSet = new Set();
    for (const cellPosition of sortedCells) {
      const cellElement = findCellByCoordinates(matrix, cellPosition.rowIndex, cellPosition.colIndex);
      if (!cellElement) {
        showNotification('선택한 영역을 해석할 수 없습니다.', 'error');
        return;
      }
      selectedCellSet.add(cellElement);
    }

    if (selectedCellSet.size < 2) {
      showNotification('병합할 셀을 2개 이상 선택해주세요.', 'warning');
      return;
    }

    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;

    for (const cellElement of selectedCellSet) {
      const meta = cellMetaMap.get(cellElement);
      if (!meta) continue;
      const { rowIndex, colIndex, rowspan = 1, colspan = 1 } = meta;
      minRow = Math.min(minRow, rowIndex);
      minCol = Math.min(minCol, colIndex);
      maxRow = Math.max(maxRow, rowIndex + rowspan - 1);
      maxCol = Math.max(maxCol, colIndex + colspan - 1);
    }

    const mainCellElement = findCellByCoordinates(matrix, minRow, minCol);
    if (!mainCellElement || !selectedCellSet.has(mainCellElement)) {
      showNotification('병합 기준 셀을 찾을 수 없습니다.', 'error');
      return;
    }

    const contentPieces = [];
    const processedCells = new Set();

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const occupant = findCellByCoordinates(matrix, r, c);
        if (!occupant || processedCells.has(occupant) || !selectedCellSet.has(occupant)) {
          continue;
        }
        const cellContent = occupant.innerHTML.trim();
        if (cellContent) {
          contentPieces.push(cellContent);
        }
        processedCells.add(occupant);
      }
    }

    const mergedContent = contentPieces.join(' ').trim();
    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    const cellsToRemove = Array.from(selectedCellSet).filter(cell => cell !== mainCellElement);
    cellsToRemove.forEach(cell => cell.remove());

    mainCellElement.setAttribute('rowspan', rowSpan);
    mainCellElement.setAttribute('colspan', colSpan);
    if (mergedContent) {
      mainCellElement.innerHTML = mergedContent;
    }

    const newHtml = doc.body.innerHTML;
    setEditedHtml(newHtml);
    saveToHistory(newHtml);
    setSelectedCells([]);
    showNotification('셀이 병합되었습니다.', 'success');
  }, [selectedCells, editedHtml, saveToHistory, showNotification]);

  // 편집 모드 토글
  const toggleEditMode = () => {
    if (isEditingTable) {
      updateHtmlFromTable();
    }
    setIsEditingTable(prev => !prev);
    setSelectedCells([]);
  };

  // 초기화
  const handleReset = () => {
    if (!selectedBeforeFile || !window.confirm('편집 내용을 모두 취소하고 원래 상태로 되돌리시겠습니까?')) {
      return;
    }
    setEditedHtml(beforeHtml);
    setHistory([beforeHtml]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
    setSelectedCells([]);
    showNotification('초기 상태로 되돌렸습니다.', 'success');
  };

  // 편집 모드일 때 테이블에 이벤트 리스너 추가
  useEffect(() => {
    if (!isEditingTable || !tableContainerRef.current || !editedHtml) return;

    const tables = getEditableTables();
    if (tables.length === 0) return;

    const registeredHandlers = [];
    const mouseUpHandler = () => handleCellMouseUp();

    tables.forEach((table, tableIndex) => {
      const { coordinateMap } = buildTableCellMaps(table, { assignDataset: true, tableIndex });
      const cells = table.querySelectorAll('td, th');

      cells.forEach((cell) => {
        const position = coordinateMap.get(cell);
        if (!position) return;
        const { rowIndex, colIndex } = position;
        
        const mouseDownHandler = (e) => {
          handleCellMouseDown(e, tableIndex, rowIndex, colIndex);
        };
        
        const mouseEnterHandler = (e) => {
          handleCellMouseEnter(e, tableIndex, rowIndex, colIndex);
        };

        cell.addEventListener('mousedown', mouseDownHandler);
        cell.addEventListener('mouseenter', mouseEnterHandler);
        registeredHandlers.push(
          { cell, type: 'mousedown', handler: mouseDownHandler },
          { cell, type: 'mouseenter', handler: mouseEnterHandler },
        );
      });
    });

    document.addEventListener('mouseup', mouseUpHandler);

    return () => {
      registeredHandlers.forEach(({ cell, type, handler }) => {
        cell.removeEventListener(type, handler);
      });
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [isEditingTable, editedHtml, handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp, getEditableTables]);

  // 선택된 셀에 스타일 적용
  useEffect(() => {
    if (!isEditingTable || !tableContainerRef.current) return;

    const tables = getEditableTables();
    if (tables.length === 0) return;

    tables.forEach((table, tableIndex) => {
      const { coordinateMap } = buildTableCellMaps(table, { assignDataset: true, tableIndex });
      const cells = table.querySelectorAll('td, th');
      
      cells.forEach((cell) => {
        const position = coordinateMap.get(cell);
        if (!position) return;
        const { rowIndex, colIndex } = position;
        
        if (selectedCells.some(c => c.tableIndex === tableIndex && c.rowIndex === rowIndex && c.colIndex === colIndex)) {
          cell.classList.add('selected');
        } else {
          cell.classList.remove('selected');
        }
      });
    });
  }, [selectedCells, isEditingTable, editedHtml, getEditableTables]);

  // 셀 편집 (더블클릭)
  useEffect(() => {
    if (!isEditingTable || !tableContainerRef.current) return;

    const tables = getEditableTables();
    if (tables.length === 0) return;

    const eventBindings = [];

    const beginEditing = (cell) => {
      if (!cell) return;
      if (editingCellRef.current && editingCellRef.current !== cell) {
        editingCellRef.current.removeAttribute('contenteditable');
        editingCellRef.current.classList.remove('cell-editing');
      }
      editingCellRef.current = cell;
      cell.setAttribute('contenteditable', 'true');
      cell.classList.add('cell-editing');
      requestAnimationFrame(() => {
        try {
          const range = document.createRange();
          range.selectNodeContents(cell);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (err) {
          // noop
        }
      });
      cell.focus();
    };

    const endEditing = (cell) => {
      if (!cell) return;
      cell.classList.remove('cell-editing');
      cell.removeAttribute('contenteditable');
      if (editingCellRef.current === cell) {
        editingCellRef.current = null;
      }
      updateHtmlFromTable();
    };

    const createDblClickHandler = (cell) => (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsSelecting(false);
      setSelectedCells([]);
      beginEditing(cell);
    };

    const createBlurHandler = (cell) => () => {
      endEditing(cell);
    };

    const createKeyDownHandler = (cell) => (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        cell.blur();
      }
    };

    tables.forEach((table) => {
      const cells = table.querySelectorAll('td, th');
      cells.forEach((cell) => {
        const dblHandler = createDblClickHandler(cell);
        const blurHandler = createBlurHandler(cell);
        const keyDownHandler = createKeyDownHandler(cell);

        cell.addEventListener('dblclick', dblHandler);
        cell.addEventListener('blur', blurHandler);
        cell.addEventListener('keydown', keyDownHandler);

        eventBindings.push(
          { cell, type: 'dblclick', handler: dblHandler },
          { cell, type: 'blur', handler: blurHandler },
          { cell, type: 'keydown', handler: keyDownHandler },
        );
      });
    });

    return () => {
      eventBindings.forEach(({ cell, type, handler }) => {
        cell.removeEventListener(type, handler);
      });
      tables.forEach((table) => {
        table.querySelectorAll('td, th').forEach((cell) => {
          cell.removeAttribute('contenteditable');
          cell.classList.remove('cell-editing');
        });
      });
      editingCellRef.current = null;
    };
  }, [isEditingTable, editedHtml, updateHtmlFromTable, getEditableTables]);

  // 키보드 단축키 (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditingTable) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingTable, handleUndo, handleRedo]);

  const toggleAfterSelection = (fileName, checked) => {
    setSelectedAfterFiles((prev) => {
      if (checked) {
        if (prev.includes(fileName)) {
          return prev;
        }
        return [...prev, fileName];
      }
      return prev.filter((name) => name !== fileName);
    });
  };

  const handleToggleAllAfter = async (checked) => {
    if (!checked) {
      // 체크 해제 시 모든 선택 해제
      setSelectedAfterFiles([]);
      return;
    }

    // after 폴더의 모든 파일 가져오기 (모든 페이지)
    try {
      const allFiles = [];
      let currentPage = 0;
      let hasMore = true;
      
      while (hasMore) {
        const response = await getQaWorkspace({
          afterPage: currentPage,
          beforePage: pages.before,
          devPage: pages.dev,
          size: 100, // 큰 사이즈로 한 번에 가져오기
        });
        
        const data = response.data || {};
        let afterData = null;
        
        if (Array.isArray(data)) {
          afterData = data.find(item => item.folder === 'after');
        } else if (data.after) {
          afterData = data.after;
        }
        
        if (afterData && Array.isArray(afterData.files)) {
          allFiles.push(...afterData.files);
          hasMore = currentPage < (afterData.totalPages - 1);
          currentPage++;
        } else {
          hasMore = false;
        }
      }
      
      const allFileNames = allFiles.map((file) => file.fileName);
      setSelectedAfterFiles(Array.from(new Set(allFileNames)));
      showNotification(`전체 ${allFileNames.length}개 파일이 선택되었습니다.`, 'success');
    } catch (error) {
      console.error('전체 파일 가져오기 실패:', error);
      showNotification('전체 파일 선택에 실패했습니다.', 'error');
    }
  };

  const handlePromoteSelectedFiles = async () => {
    if (selectedAfterFiles.length === 0) {
      return;
    }
    setIsPromoting(true);
    for (const fileName of selectedAfterFiles) {
      try {
        const response = await promoteAfterFile(fileName);
        const responseData = response.data?.data ?? response.data;
        const pathPayload = Array.isArray(responseData) ? responseData : [];

        if (pathPayload.length === 0) {
          showNotification(
            `"${fileName}" 파일 이동 응답이 비어 있어 배치 작업을 실행할 수 없습니다.`,
            'warning'
          );
          continue;
        }

        showNotification(`"${fileName}" 파일이 Dev 폴더로 이동했습니다. 배치를 시작합니다.`, 'success');

        try {
          const batchResponse = await startInferenceResultJob(pathPayload);
          const batchResult = batchResponse.data?.result || 'UNKNOWN';
          const batchMessage = batchResponse.data?.message || '배치 작업이 완료되었습니다.';
          const isSuccess = batchResult.toUpperCase() === 'SUCCESS';
          showNotification(
            `"${fileName}" 배치 결과: ${batchMessage}`,
            isSuccess ? 'success' : 'warning'
          );
        } catch (batchError) {
          const batchMessage = batchError.response?.data?.message || '배치 API 호출에 실패했습니다.';
          showNotification(`"${fileName}" 배치 실패: ${batchMessage}`, 'error');
        }
      } catch (error) {
        const message = error.response?.data?.message || '파일 이동에 실패했습니다.';
        showNotification(`"${fileName}" 이동 실패: ${message}`, 'error');
      }
    }
    setSelectedAfterFiles([]);
    await fetchWorkspace({ folderKeys: ['after', 'dev'] });
    setIsPromoting(false);
  };

  const handleFolderPageChange = (folderKey, nextPage) => {
    if (nextPage < 0) {
      return;
    }
    const folderData = workspace[folderKey];
    if (folderData.totalPages > 0 && nextPage > folderData.totalPages - 1) {
      return;
    }
    if (loadingFolders[folderKey]) {
      return;
    }
    setPages((prev) => ({ ...prev, [folderKey]: nextPage }));
    fetchWorkspace({ [`${folderKey}Page`]: nextPage, folderKeys: [folderKey] });
  };

  const renderPagination = (folderKey) => {
    const folderData = workspace[folderKey];
    if (folderData.totalPages <= 1) {
      return null;
    }
    const folderLoading = !!loadingFolders[folderKey];
    
    const currentPage = folderData.page || 0;
    const totalPages = folderData.totalPages || 1;
    
    // 페이지 번호 배열 생성 (최대 5개 표시)
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
      let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
      
      // 끝에서 시작점 조정
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(0, endPage - maxVisible + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    };
    
    const pageNumbers = getPageNumbers();
    
    return (
      <div className="pagination" style={{ 
        justifyContent: 'center', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        marginTop: '16px',
      }}>
        <button
          className="btn-secondary"
          onClick={() => handleFolderPageChange(folderKey, currentPage - 1)}
          disabled={currentPage === 0 || folderLoading}
          style={{ 
            minWidth: '36px',
            height: '36px',
            padding: '0',
            fontSize: '14px',
          }}
        >
          ‹
        </button>
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            className={pageNum === currentPage ? 'btn-primary' : 'btn-secondary'}
            onClick={() => handleFolderPageChange(folderKey, pageNum)}
            disabled={folderLoading}
            style={{
              minWidth: '36px',
              height: '36px',
              padding: '0',
              fontSize: '14px',
              fontWeight: pageNum === currentPage ? '600' : '400',
            }}
          >
            {pageNum + 1}
          </button>
        ))}
        <button
          className="btn-secondary"
          onClick={() => handleFolderPageChange(folderKey, currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || folderLoading}
          style={{ 
            minWidth: '36px',
            height: '36px',
            padding: '0',
            fontSize: '14px',
          }}
        >
          ›
        </button>
      </div>
    );
  };

  const renderFolderSection = (folderKey) => {
    const folderData = workspace[folderKey] || createFolderState();
    const folderLoading = !!loadingFolders[folderKey];
    const isAfter = folderKey === 'after';
    const isBefore = folderKey === 'before';
    
    // 안전성 체크
    if (!folderData || !Array.isArray(folderData.files)) {
      console.warn(`Invalid folderData for ${folderKey}:`, folderData);
    }

    return (
      <section
        key={folderKey}
        style={{
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0,
            minHeight: isBefore || isAfter ? '40px' : 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{FOLDER_LABELS[folderKey]}</h2>
            <span style={{ color: '#6b7280', fontSize: '13px' }}>{folderData.totalElements || 0}개</span>
          </div>
          {isAfter && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={
                    workspace.after.totalElements > 0 &&
                    workspace.after.totalElements === selectedAfterFiles.length
                  }
                  onChange={(e) => handleToggleAllAfter(e.target.checked)}
                  disabled={workspace.after.totalElements === 0 || folderLoading}
                />
                전체 선택
              </label>
              <button
                className="btn-primary"
                disabled={selectedAfterFiles.length === 0 || isPromoting}
                onClick={handlePromoteSelectedFiles}
              >
                {isPromoting ? '업로드드 중...' : `Dev로 보내기 (${selectedAfterFiles.length}개)`}
              </button>
            </div>
          )}
          {isBefore && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="파일명 검색..."
                value={beforeSearchInput}
                onChange={(e) => setBeforeSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBeforeSearch();
                  }
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '200px',
                }}
              />
              <button
                className="btn-secondary"
                onClick={handleBeforeSearch}
                disabled={folderLoading}
              >
                검색
              </button>
              {(beforeSearchInput || activeBeforeKeyword) && (
                <button
                  className="btn-secondary"
                  onClick={handleClearBeforeSearch}
                  disabled={folderLoading}
                >
                  초기화
                </button>
              )}
              {folderLoading && (
                <span style={{ color: '#6b7280', fontSize: '13px' }}>검색 중...</span>
              )}
            </div>
          )}
        </div>

        <div
          className="table-container"
          style={{
            flex: '0 0 auto',
            overflowX: 'auto',
            overflowY: 'hidden',
            maxHeight: 'none',
          }}
        >
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2c3e50' }}>
              <tr>
                {isAfter && <th style={{ width: '48px' }}>☑️</th>}
                <th style={{ width: isBefore || isAfter ? '200px' : 'auto' }}>파일명</th>
                <th style={{ width: isBefore || isAfter ? '80px' : 'auto' }}>파일 크기</th>
                <th style={{ width: isBefore || isAfter ? '140px' : 'auto' }}>최종 수정</th>
                <th style={{ width: isBefore || isAfter ? '0px' : 'auto', display: isBefore || isAfter ? 'none' : 'table-cell' }}>경로</th>
              </tr>
            </thead>
            <tbody>
              {folderLoading ? (
                <tr>
                  <td colSpan={isAfter ? 5 : 4} className="empty-message">
                    로딩 중...
                  </td>
                </tr>
              ) : !folderData.files || folderData.files.length === 0 ? (
                <tr>
                  <td colSpan={isAfter ? 5 : 4} className="empty-message">
                    파일이 없습니다.
                  </td>
                </tr>
              ) : (
                (folderData.files || []).map((file) => {
                  return (
                    <tr
                      key={`${folderKey}-${file.fileName}`}
                      className="data-table-row"
                      style={{
                        cursor: isBefore ? 'pointer' : 'default',
                        outline: 'none',
                        border: 'none',
                        boxShadow: 'none',
                      }}
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        if (isBefore) {
                          handleSelectBeforeFile({ folder: folderKey, ...file });
                        }
                      }}
                      onFocus={(e) => {
                        e.currentTarget.blur();
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.blur();
                        if (isBefore) {
                          handleSelectBeforeFile({ folder: folderKey, ...file });
                        }
                      }}
                    >
                      {isAfter && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedAfterFiles.includes(file.fileName)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleAfterSelection(file.fileName, e.target.checked);
                            }}
                          />
                    </td>
                      )}
                      <td style={{ 
                        maxWidth: isBefore || isAfter ? '200px' : '360px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{file.fileName}</td>
                      <td>{file.fileSize ? formatFileSize(file.fileSize) : '-'}</td>
                      <td>{file.lastModifiedAt ? (isBefore || isAfter ? formatDateTimeWithoutSeconds(file.lastModifiedAt) : formatDateTime(file.lastModifiedAt)) : '-'}</td>
                      <td
                        style={{ 
                          maxWidth: '360px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: isBefore || isAfter ? 'none' : 'table-cell',
                        }}
                      >
                        {(() => {
                          if (!file.absolutePath) return '-';
                          // /before, /after, /dev 부분만 추출
                          const path = file.absolutePath.replace(/\\/g, '/');
                          const match = path.match(/\/(before|after|dev)(?:\/|$)/);
                          return match ? `/${match[1]}` : file.absolutePath;
                        })()}
                      </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div style={{ flexShrink: 0 }}>
          {renderPagination(folderKey)}
        </div>
      </section>
    );
  };

  return (
    <div className="page-container">
      <NotificationContainer
        notifications={notifications}
        removeNotification={removeNotification}
      />
      <h1 className="page-title">QA</h1>
      <div className="page-content">
        {/* 새로고침 버튼 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <button className="btn-secondary" onClick={() => fetchWorkspace()} disabled={loadingWorkspace}>
            🔄
          </button>
        </div>

        {/* Dev 폴더 (전체 너비) */}
        {renderFolderSection('dev')}

        {/* 파일 업로드 영역 */}
        <div
          style={{
            marginBottom: '16px',
          }}
        >
          <div>
            <label className="form-label">HTML 파일 업로드 (자동으로 Before 폴더에 저장)</label>
            <input
              type="file"
              accept=".html,.htm"
              multiple
              onChange={handleBeforeUploadChange}
              disabled={isUploading}
            />
            {isUploading && <p style={{ color: '#6b7280', marginTop: '4px' }}>업로드 중...</p>}
          </div>
        </div>

        {/* Before/After 폴더 나란히 배치 */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            alignItems: 'stretch',
          }}
        >
          {/* Before 폴더 왼쪽 */}
          <div style={{ flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
            {renderFolderSection('before')}
          </div>

          {/* After 폴더 오른쪽 */}
          <div style={{ flex: '1', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
            {renderFolderSection('after')}
          </div>
        </div>

        <section style={{ marginTop: '48px' }}>
          {!selectedBeforeFile ? (
            <p style={{ color: '#6b7280' }}>수정할 Before 파일을 선택해주세요.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <strong>파일명:</strong> {selectedBeforeFile.fileName}
                  </div>
                  <div>
                    <strong>크기:</strong>{' '}
                    {selectedBeforeFile.fileSize ? formatFileSize(selectedBeforeFile.fileSize) : '-'}
                  </div>
                  <div>
                    <strong>최종 수정:</strong>{' '}
                    {selectedBeforeFile.lastModifiedAt
                      ? formatDateTime(selectedBeforeFile.lastModifiedAt)
                      : '-'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <button
                  className={isEditingTable ? 'btn-primary' : 'btn-secondary'}
                  onClick={toggleEditMode}
                  disabled={isFetchingBeforeFile}
                >
                  {isEditingTable ? '편집 완료' : '테이블 편집'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveBeforeFile}
                  disabled={isSavingBeforeHtml || isFetchingBeforeFile}
                >
                  {isSavingBeforeHtml ? '저장 중...' : 'HTML 저장'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleConvertToJsonl}
                  disabled={isConverting || isFetchingBeforeFile}
                >
                  {isConverting ? '변환 중...' : 'JSONL 변환 (After 폴더로 이동)'}
                </button>
                {isEditingTable && (
                  <>
                    <button
                      className="btn-secondary"
                      onClick={handleReset}
                      title="원래 상태로 초기화"
                    >
                      초기화
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      title="뒤로가기 (Ctrl+Z)"
                    >
                      ↶ 뒤로가기
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      title="앞으로가기 (Ctrl+Y)"
                    >
                      ↷ 앞으로가기
                    </button>
                    {selectedCells.length >= 2 && (
                      <button
                        className="btn-primary"
                        onClick={handleMergeCells}
                      >
                        선택한 셀 병합
                      </button>
                    )}
                  </>
                )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                {isFetchingBeforeFile ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    불러오는 중...
                  </div>
                ) : editedHtml ? (
                  <div
                    ref={tableContainerRef}
                    style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      position: 'relative',
                      overflow: 'auto',
                      maxHeight: '70vh',
                      width: '100%',
                    }}
                    onWheel={(e) => {
                      if (e.shiftKey && e.deltaY !== 0) {
                        e.preventDefault();
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    <div
                      ref={sheetContentRef}
                      className={`sheet-html-content ${isEditingTable ? 'editing-mode' : ''}`}
                      dangerouslySetInnerHTML={{ __html: editedHtml }}
                      style={{
                        padding: '8px',
                        minWidth: 'fit-content',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    HTML 내용이 없습니다.
                  </div>
                    )}
                </div>
              </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default QA;

