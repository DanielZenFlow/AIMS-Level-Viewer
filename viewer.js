const colors = {
  BLUE: '#3050ff',
  RED: '#ff0000',
  CYAN: '#00ffff',
  PURPLE: '#6000b0',
  GREEN: '#00ff00',
  ORANGE: '#ff8000',
  PINK: '#f060c0',
  GREY: '#707070',
  GRAY: '#707070',
  LIGHTBLUE: '#70c0ff',
  BROWN: '#603000',
  DEFAULT: '#c0c0c0',
};

let currentLevel = null;
let levelEntries = [];
let selectedEntryId = null;
let openDirectorySource = null;
let directoryAutoOpen = true;
let removedManifestLevelKeys = new Set();
let highlightCoord = null;
let notificationTimer = null;

const FONT_SIZE_STORAGE_KEY = 'aims-level-viewer:font-size-px';
const LOG_FONT_SIZE_STORAGE_KEY = 'aims-level-viewer:detail-font-size-px';
const LEVEL_LIBRARY_DB_NAME = 'aims-level-viewer';
const LEVEL_LIBRARY_DB_VERSION = 1;
const LEVEL_LIBRARY_STORE_NAME = 'viewer-state';
const LEVEL_LIBRARY_KEY = 'level-library';
const LEVEL_LIBRARY_LOCAL_STORAGE_KEY = 'aims-level-viewer:level-library';
const REMOVED_MANIFEST_LEVELS_STORAGE_KEY = 'aims-level-viewer:removed-manifest-levels';
const VIEWER_VERSION = 'v1.0.0';
const DEFAULT_UI_FONT_SIZE = 12;
const DEFAULT_LOG_FONT_SIZE = 11;
const MIN_UI_FONT_SIZE = 9;
const MAX_UI_FONT_SIZE = 24;
const MIN_LOG_FONT_SIZE = 8;
const MAX_LOG_FONT_SIZE = 24;

const BASE_CELL = 30;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;

const state = {
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const panDrag = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
};

const els = {
  app: document.querySelector('.app'),
  boardWrap: document.querySelector('.boardWrap'),
  meta: document.getElementById('meta'),
  fileInput: document.getElementById('fileInput'),
  directoryInput: document.getElementById('directoryInput'),
  dropZone: document.getElementById('dropZone'),
  trackInput: document.getElementById('trackInput'),
  coordInput: document.getElementById('coordInput'),
  coordGoBtn: document.getElementById('coordGoBtn'),
  coordClearBtn: document.getElementById('coordClearBtn'),
  levelSearchInput: document.getElementById('levelSearchInput'),
  prevLevelBtn: document.getElementById('prevLevelBtn'),
  nextLevelBtn: document.getElementById('nextLevelBtn'),
  clearLibraryBtn: document.getElementById('clearLibraryBtn'),
  libraryInfo: document.getElementById('libraryInfo'),
  levelList: document.getElementById('levelList'),
  details: document.getElementById('details'),
  detailsSection: document.getElementById('details')?.closest('section'),
  hoverInfo: document.getElementById('hoverInfo'),
  levelTitle: document.getElementById('levelTitle'),
  boards: document.getElementById('boards'),
  panViewport: document.getElementById('panViewport'),
  panSurface: document.getElementById('panSurface'),
  axisTopInner: document.getElementById('axisTopInner'),
  axisLeftInner: document.getElementById('axisLeftInner'),
  hoverTip: document.getElementById('hoverTip'),
  statusInfo: document.getElementById('statusInfo'),
  zoomInfo: document.getElementById('zoomInfo'),
  resetViewBtn: document.getElementById('resetView'),
  fontSettingsBtn: document.getElementById('fontSettingsBtn'),
  fontSettingsDialog: document.getElementById('fontSettingsDialog'),
  uiFontSizeInput: document.getElementById('uiFontSizeInput'),
  logFontSizeInput: document.getElementById('logFontSizeInput'),
  fontSettingsResetBtn: document.getElementById('fontSettingsResetBtn'),
  fontSettingsCloseBtn: document.getElementById('fontSettingsCloseBtn'),
  helpBtn: document.getElementById('helpBtn'),
  helpDialog: document.getElementById('helpDialog'),
  helpCloseBtn: document.getElementById('helpCloseBtn'),
  notificationToast: document.getElementById('notificationToast'),
  notificationTitle: document.getElementById('notificationTitle'),
  notificationMessage: document.getElementById('notificationMessage'),
  notificationCloseBtn: document.getElementById('notificationCloseBtn'),
  buildVersion: document.getElementById('buildVersion'),
};

init();

async function init() {
  if (els.buildVersion) els.buildVersion.textContent = VIEWER_VERSION;
  initDialogs();
  initFontSettings();
  initNotifications();
  initInputs();
  initBoardNavigation();
  restoreRemovedManifestLevelKeys();
  loadManifestEntries();
  await restoreStoredEntries();
  applyZoom();
  applyPan();
  if (!currentLevel && levelEntries.length > 0) {
    loadEntry(levelEntries[0]);
  } else {
    render();
  }
}

function initDialogs() {
  els.helpBtn.addEventListener('click', () => {
    els.helpDialog.hidden = false;
  });
  els.helpCloseBtn.addEventListener('click', closeHelpDialog);
  els.helpDialog.addEventListener('click', event => {
    if (event.target === els.helpDialog) closeHelpDialog();
  });
  els.fontSettingsBtn.addEventListener('click', showFontSettingsDialog);
  els.fontSettingsCloseBtn.addEventListener('click', hideFontSettingsDialog);
  els.fontSettingsResetBtn.addEventListener('click', resetFontSettings);
  els.fontSettingsDialog.addEventListener('click', event => {
    if (event.target === els.fontSettingsDialog) hideFontSettingsDialog();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.helpDialog.hidden) closeHelpDialog();
    if (event.key === 'Escape' && !els.fontSettingsDialog.hidden) hideFontSettingsDialog();
  });
}

function initFontSettings() {
  const savedUi = localStorageAvailable() ? Number(localStorage.getItem(FONT_SIZE_STORAGE_KEY)) : NaN;
  const savedLog = localStorageAvailable() ? Number(localStorage.getItem(LOG_FONT_SIZE_STORAGE_KEY)) : NaN;
  const uiSize = clampUIFontSize(Number.isFinite(savedUi) ? savedUi : DEFAULT_UI_FONT_SIZE);
  const logSize = clampLogFontSize(Number.isFinite(savedLog) ? savedLog : DEFAULT_LOG_FONT_SIZE);
  els.uiFontSizeInput.value = String(uiSize);
  els.logFontSizeInput.value = String(logSize);
  applyUIFontSize(uiSize);
  applyLogFontSize(logSize);
  els.uiFontSizeInput.addEventListener('input', () => {
    applyUIFontSize(clampUIFontSize(Number(els.uiFontSizeInput.value)));
  });
  els.uiFontSizeInput.addEventListener('change', () => {
    const next = clampUIFontSize(Number(els.uiFontSizeInput.value));
    els.uiFontSizeInput.value = String(next);
    applyUIFontSize(next);
  });
  els.logFontSizeInput.addEventListener('input', () => {
    applyLogFontSize(clampLogFontSize(Number(els.logFontSizeInput.value)));
  });
  els.logFontSizeInput.addEventListener('change', () => {
    const next = clampLogFontSize(Number(els.logFontSizeInput.value));
    els.logFontSizeInput.value = String(next);
    applyLogFontSize(next);
  });
}

function initNotifications() {
  els.notificationCloseBtn.addEventListener('click', clearNotification);
  window.addEventListener('error', event => {
    showError(event.message || 'Unexpected viewer error.', 'Viewer error');
  });
  window.addEventListener('unhandledrejection', event => {
    showError(errorMessage(event.reason), 'Viewer error');
  });
}

function initInputs() {
  els.fileInput.addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (file) await loadSingleFile(file);
    els.fileInput.value = '';
  });

  els.directoryInput.addEventListener('change', async event => {
    const files = [...(event.target.files || [])].filter(isLevelFile);
    if (files.length > 0) {
      await loadDirectoryFiles(files);
    } else {
      showError('No .lvl files were found in that directory.', 'Nothing to load');
    }
    els.directoryInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(type => {
    els.dropZone.addEventListener(type, event => {
      event.preventDefault();
      els.dropZone.classList.add('drag');
    });
  });
  ['dragleave', 'drop'].forEach(type => {
    els.dropZone.addEventListener(type, event => {
      event.preventDefault();
      els.dropZone.classList.remove('drag');
    });
  });
  els.dropZone.addEventListener('drop', async event => {
    const files = [...(event.dataTransfer.files || [])].filter(isLevelFile);
    if (files.length === 0) {
      showError('Read one or more .lvl files.', 'Unsupported file');
      return;
    }
    if (files.length === 1) {
      await loadSingleFile(files[0]);
    } else {
      await loadDirectoryFiles(files, 'Read files');
    }
  });

  els.trackInput.addEventListener('input', render);
  els.coordGoBtn.addEventListener('click', goToCoordinate);
  els.coordClearBtn.addEventListener('click', () => {
    highlightCoord = null;
    els.coordInput.value = '';
    render();
  });
  els.coordInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') goToCoordinate();
  });
  els.levelSearchInput.addEventListener('input', renderLevelList);
  els.prevLevelBtn.addEventListener('click', () => switchLevel(-1));
  els.nextLevelBtn.addEventListener('click', () => switchLevel(1));
  els.clearLibraryBtn.addEventListener('click', () => {
    levelEntries = [];
    selectedEntryId = null;
    openDirectorySource = null;
    directoryAutoOpen = true;
    currentLevel = null;
    renderLevelList();
    render();
    persistStoredEntries().catch(error => {
      console.warn('Unable to clear stored level library:', error);
    });
  });
  els.levelList.addEventListener('click', event => {
    const deleteButton = closestElement(event.target, 'button[data-entry-delete-id]');
    if (deleteButton) {
      event.preventDefault();
      deleteEntryById(deleteButton.dataset.entryDeleteId);
      return;
    }

    const levelButton = closestElement(event.target, 'button[data-entry-id]');
    if (levelButton) {
      event.preventDefault();
      loadEntryById(levelButton.dataset.entryId);
      return;
    }

    const toggleButton = closestElement(event.target, 'button[data-directory-source]');
    if (toggleButton) {
      event.preventDefault();
      toggleDirectory(toggleButton.dataset.directorySource);
    }
  });
}

function initBoardNavigation() {
  els.resetViewBtn.addEventListener('click', resetView);
  els.boards.addEventListener('pointerdown', startPanDrag);
  els.boards.addEventListener('pointermove', event => {
    updatePanDrag(event);
    updateHover(event);
  });
  els.boards.addEventListener('pointerup', endPanDrag);
  els.boards.addEventListener('pointercancel', endPanDrag);
  els.boards.addEventListener('mouseleave', () => {
    endPanDrag({});
    hideHover();
  });
  els.boards.addEventListener('wheel', event => {
    if (!currentLevel) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });
}

function closeHelpDialog() {
  els.helpDialog.hidden = true;
}

function showFontSettingsDialog() {
  els.fontSettingsDialog.hidden = false;
  els.uiFontSizeInput.focus();
  els.uiFontSizeInput.select();
}

function hideFontSettingsDialog() {
  els.fontSettingsDialog.hidden = true;
}

function resetFontSettings() {
  els.uiFontSizeInput.value = String(DEFAULT_UI_FONT_SIZE);
  els.logFontSizeInput.value = String(DEFAULT_LOG_FONT_SIZE);
  applyUIFontSize(DEFAULT_UI_FONT_SIZE);
  applyLogFontSize(DEFAULT_LOG_FONT_SIZE);
}

function clampUIFontSize(value) {
  if (!Number.isFinite(value)) return DEFAULT_UI_FONT_SIZE;
  return Math.max(MIN_UI_FONT_SIZE, Math.min(MAX_UI_FONT_SIZE, Math.round(value)));
}

function clampLogFontSize(value) {
  if (!Number.isFinite(value)) return DEFAULT_LOG_FONT_SIZE;
  return Math.max(MIN_LOG_FONT_SIZE, Math.min(MAX_LOG_FONT_SIZE, Math.round(value)));
}

function applyUIFontSize(size) {
  const next = clampUIFontSize(size);
  document.documentElement.style.setProperty('--ui-font-size', `${next}px`);
  els.fontSettingsBtn.textContent = `${next}px`;
  if (localStorageAvailable()) localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next));
}

function applyLogFontSize(size) {
  const next = clampLogFontSize(size);
  document.documentElement.style.setProperty('--log-font-size', `${next}px`);
  if (localStorageAvailable()) localStorage.setItem(LOG_FONT_SIZE_STORAGE_KEY, String(next));
}

async function loadSingleFile(file) {
  try {
    const text = await file.text();
    const entry = makeEntryFromFile(file, text, 'File');
    addLevelEntries([entry]);
    loadEntry(entry);
  } catch (error) {
    showError(errorMessage(error), 'Unable to load level');
  }
}

async function loadDirectoryFiles(files, sourceLabel = '') {
  try {
    const entries = await Promise.all(files.map(async file => {
      const text = await file.text();
      const source = sourceLabel || directoryRootName(file) || 'Directory';
      return makeEntryFromFile(file, text, source);
    }));
    addLevelEntries(entries);
    if (entries.length > 0) {
      loadEntry(entries[0]);
      showNotice(`${entries.length} .lvl files added to the level list.`, 'Directory read');
    }
  } catch (error) {
    showError(errorMessage(error), 'Unable to load directory');
  }
}

function loadManifestEntries() {
  const manifest = Array.isArray(window.LEVELS_MANIFEST) ? window.LEVELS_MANIFEST : [];
  if (manifest.length === 0) {
    renderLevelList();
    return;
  }
  const entries = manifest
    .filter(item => item && typeof item.content === 'string')
    .map((item, index) => ({
      name: item.name || stem(item.path || `Level ${index + 1}`),
      fileName: fileName(item.path || `${item.name || `Level ${index + 1}`}.lvl`),
      path: item.path || item.name || `manifest-${index + 1}.lvl`,
      source: item.group || 'Manifest',
      content: item.content,
      persistent: false,
    }));
  addLevelEntries(entries, { persist: false });
  renderLevelList();
}

async function restoreStoredEntries() {
  try {
    const entries = await readStoredEntries();
    if (entries.length > 0) {
      const before = levelEntries.filter(entry => entry.persistent !== false).length + entries.length;
      addLevelEntries(entries, { persist: false });
      const after = levelEntries.filter(entry => entry.persistent !== false).length;
      if (after < before) {
        persistStoredEntries().catch(error => {
          console.warn('Unable to clean stored level library:', error);
        });
      }
    }
  } catch (error) {
    console.warn('Unable to restore level library:', error);
  }
}

function makeEntryFromFile(file, content, fallbackSource) {
  const path = file.webkitRelativePath || file.name;
  const source = directoryRootName(file) || fallbackSource || 'File';
  return {
    name: stem(file.name),
    fileName: file.name,
    path,
    source,
    content,
    persistent: true,
  };
}

function addLevelEntries(entries, options = {}) {
  const shouldPersist = options.persist !== false;
  const selectedKey = selectedEntryId ? entryKey(levelEntries.find(entry => entry.id === selectedEntryId)) : '';
  const byKey = new Map();
  for (const entry of levelEntries) {
    const normalized = normalizeEntry(entry);
    byKey.set(entryKey(normalized), normalized);
  }
  for (const entry of entries) {
    const normalized = normalizeEntry(entry);
    if (normalized.persistent === false && removedManifestLevelKeys.has(entryKey(normalized))) {
      continue;
    }
    byKey.set(entryKey(normalized), normalized);
  }
  levelEntries = [...byKey.values()].sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
  if (selectedKey && !levelEntries.some(entry => entry.id === selectedEntryId)) {
    selectedEntryId = levelEntries.find(entry => entryKey(entry) === selectedKey)?.id || selectedEntryId;
  }
  renderLevelList();
  if (shouldPersist) {
    persistStoredEntries().catch(error => {
      console.warn('Unable to store level library:', error);
      showError('The directory was read, but the browser could not remember it for the next refresh.', 'Storage unavailable');
    });
  }
}

function normalizeEntry(entry) {
  const path = String(entry.path || entry.fileName || entry.name || 'level.lvl');
  const displayFileName = entry.fileName || fileName(path) || `${entry.name || stem(path)}.lvl`;
  const source = sourceFromPath(path) || entry.source || 'Levels';
  const normalized = {
    name: entry.name || stem(displayFileName),
    fileName: displayFileName,
    path,
    source,
    content: String(entry.content || ''),
    persistent: entry.persistent !== false,
  };
  return {
    ...normalized,
    id: levelEntryId(normalized),
  };
}

function levelEntryId(entry) {
  return `level:${entryKey(entry)}`;
}

function entryKey(entry) {
  if (!entry) return '';
  const path = canonicalPath(entry.path || entry.fileName || entry.name);
  const grouped = path.match(/(?:^|\/)(levels|complevels|complevels26)\/(.+\.lvl)$/);
  if (grouped) return `${grouped[1]}/${grouped[2]}`;
  const source = normalizePathPart(entry.source || 'Levels');
  return `${source}/${path || normalizePathPart(entry.fileName || entry.name || 'level.lvl')}`;
}

function sourceFromPath(path) {
  const grouped = canonicalPath(path).match(/(?:^|\/)(levels|complevels|complevels26)\/.+\.lvl$/);
  return grouped ? grouped[1] : '';
}

function canonicalPath(path) {
  return normalizePathPart(path).replace(/^\.\//, '');
}

function normalizePathPart(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

async function persistStoredEntries() {
  const entries = levelEntries
    .filter(entry => entry.persistent !== false)
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      fileName: entry.fileName,
      path: entry.path,
      source: entry.source,
      content: entry.content,
      persistent: true,
    }));

  const record = {
    entries,
    savedAt: new Date().toISOString(),
  };

  try {
    await writeStoredEntriesToIndexedDb(record);
  } catch (error) {
    if (!localStorageAvailable()) throw error;
    localStorage.setItem(LEVEL_LIBRARY_LOCAL_STORAGE_KEY, JSON.stringify(record));
  }
}

async function readStoredEntries() {
  try {
    const record = await readStoredEntriesFromIndexedDb();
    if (Array.isArray(record?.entries)) return record.entries.map(normalizeEntry);
  } catch (error) {
    console.warn('IndexedDB level library unavailable:', error);
  }

  if (!localStorageAvailable()) return [];
  const raw = localStorage.getItem(LEVEL_LIBRARY_LOCAL_STORAGE_KEY);
  if (!raw) return [];
  const record = JSON.parse(raw);
  return Array.isArray(record?.entries) ? record.entries.map(normalizeEntry) : [];
}

function openLevelLibraryStorage() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }
    const request = indexedDB.open(LEVEL_LIBRARY_DB_NAME, LEVEL_LIBRARY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEVEL_LIBRARY_STORE_NAME)) {
        db.createObjectStore(LEVEL_LIBRARY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open level library storage.'));
  });
}

async function writeStoredEntriesToIndexedDb(record) {
  const db = await openLevelLibraryStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LEVEL_LIBRARY_STORE_NAME, 'readwrite');
    tx.objectStore(LEVEL_LIBRARY_STORE_NAME).put(record, LEVEL_LIBRARY_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Unable to store level library.'));
    };
  });
}

async function readStoredEntriesFromIndexedDb() {
  const db = await openLevelLibraryStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LEVEL_LIBRARY_STORE_NAME, 'readonly');
    const request = tx.objectStore(LEVEL_LIBRARY_STORE_NAME).get(LEVEL_LIBRARY_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Unable to read level library.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Unable to read level library.'));
    };
  });
}

function loadEntry(entry, options = {}) {
  const normalized = normalizeEntry(entry);
  if (!normalized.content.trim()) {
    showError(`${normalized.fileName || normalized.name} has no readable .lvl content. Read the file or directory again.`, 'Unable to read level');
    return;
  }

  let parsed;
  try {
    parsed = parseLevel(normalized.content, normalized.path);
  } catch (error) {
    showError(errorMessage(error), `Unable to parse ${normalized.fileName || normalized.name || 'level'}`);
    return;
  }

  currentLevel = parsed;
  selectedEntryId = normalized.id;
  openDirectorySource = normalized.source || openDirectorySource;
  directoryAutoOpen = true;
  highlightCoord = null;
  els.coordInput.value = '';

  try {
    renderCurrentLevel();
    resetView();
    scrollActiveLevelIntoView();
    if (options.scrollBoard !== false) {
      els.boards.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  } catch (error) {
    console.error('Unable to render level:', error);
    showError(errorMessage(error), `Unable to render ${normalized.fileName || normalized.name || 'level'}`);
  }
}

function loadEntryById(entryId) {
  const entry = levelEntries.find(item => item.id === entryId);
  if (!entry) {
    showError('This level entry is no longer available. Read the directory again.', 'Unable to read level');
    return;
  }
  loadEntry(entry);
}

function deleteEntryById(entryId) {
  const entry = levelEntries.find(item => item.id === entryId);
  if (!entry) {
    showError('This level entry is no longer available.', 'Unable to delete level');
    return;
  }

  const label = entry.fileName || fileName(entry.path) || entry.name || 'this level';
  const ok = window.confirm(`Remove ${label} from the level list?\n\nThis does not delete the .lvl file from disk.`);
  if (!ok) return;

  const filteredBefore = filteredLevelEntries();
  const deletedIndex = filteredBefore.findIndex(item => item.id === entryId);
  const wasSelected = selectedEntryId === entryId;

  levelEntries = levelEntries.filter(item => item.id !== entryId);
  if (wasSelected) {
    selectedEntryId = null;
    currentLevel = null;
    highlightCoord = null;
    els.coordInput.value = '';
  }
  if (entry.persistent === false) {
    removedManifestLevelKeys.add(entryKey(entry));
    persistRemovedManifestLevelKeys();
  }

  const sameSourceExists = openDirectorySource && levelEntries.some(item => item.source === openDirectorySource);
  if (!sameSourceExists) {
    openDirectorySource = null;
    directoryAutoOpen = true;
  }

  persistStoredEntries().catch(error => {
    console.warn('Unable to store level library after deletion:', error);
    showError('The level was removed from this view, but the browser could not remember the updated library.', 'Storage unavailable');
  });

  if (wasSelected) {
    const filteredAfter = filteredLevelEntries();
    if (filteredAfter.length > 0) {
      const nextIndex = deletedIndex < 0 ? 0 : Math.min(deletedIndex, filteredAfter.length - 1);
      loadEntry(filteredAfter[nextIndex], { scrollBoard: false });
    } else {
      render();
    }
  } else {
    renderLevelList();
  }
}

function restoreRemovedManifestLevelKeys() {
  if (!localStorageAvailable()) return;
  try {
    const raw = localStorage.getItem(REMOVED_MANIFEST_LEVELS_STORAGE_KEY);
    const keys = raw ? JSON.parse(raw) : [];
    removedManifestLevelKeys = new Set(Array.isArray(keys) ? keys.map(String) : []);
  } catch (error) {
    console.warn('Unable to restore removed manifest levels:', error);
    removedManifestLevelKeys = new Set();
  }
}

function persistRemovedManifestLevelKeys() {
  if (!localStorageAvailable()) return;
  try {
    localStorage.setItem(REMOVED_MANIFEST_LEVELS_STORAGE_KEY, JSON.stringify([...removedManifestLevelKeys]));
  } catch (error) {
    console.warn('Unable to store removed manifest levels:', error);
  }
}

function parseLevel(text, sourcePath = '') {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  let domain = '';
  let name = sourcePath ? stem(sourcePath) : 'Unknown';
  let section = '';
  const initialGrid = [];
  const goalGrid = [];
  const agentColors = {};
  const boxColors = {};
  const colorAssignments = new Map();
  const warnings = [];

  for (const rawLine of lines) {
    if (rawLine.startsWith('#')) {
      section = rawLine.slice(1).trim().toLowerCase();
      if (section === 'end') break;
      continue;
    }

    if (!section) continue;
    if (section === 'domain') {
      if (rawLine.trim()) domain = rawLine.trim();
    } else if (section === 'levelname') {
      if (rawLine.trim()) name = rawLine.trim();
    } else if (section === 'colors') {
      parseColorLine(rawLine, agentColors, boxColors, colorAssignments, warnings);
    } else if (section === 'initial') {
      initialGrid.push(rawLine);
    } else if (section === 'goal') {
      goalGrid.push(rawLine);
    }
  }

  trimTrailingEmptyRows(initialGrid);
  trimTrailingEmptyRows(goalGrid);

  if (initialGrid.length === 0) throw new Error('No #initial grid found in level.');
  if (goalGrid.length === 0) throw new Error('No #goal grid found in level.');
  if (goalGrid.length !== initialGrid.length) {
    throw new Error(`Goal grid rows (${goalGrid.length}) must match initial grid rows (${initialGrid.length}).`);
  }

  const rows = initialGrid.length;
  const cols = Math.max(
    ...initialGrid.map(line => line.length),
    ...goalGrid.map(line => line.length),
    0,
  );

  const walls = [];
  const agents = [];
  const boxes = [];
  const boxGoals = [];
  const agentGoals = [];
  const seenAgents = new Set();
  const seenBoxTypes = new Set();

  for (let r = 0; r < rows; r++) {
    let wallRow = '';
    for (let c = 0; c < cols; c++) {
      const initialChar = charAt(initialGrid[r], c);
      const goalChar = charAt(goalGrid[r], c);
      const initialWall = initialChar === '+';
      const goalWall = goalChar === '+';

      if (initialWall !== goalWall) {
        throw new Error(`Wall mismatch at (${r},${c}).`);
      }

      wallRow += initialWall ? '+' : ' ';

      if (isAgentChar(initialChar)) {
        const id = Number(initialChar);
        agents.push({ id, r, c });
        seenAgents.add(id);
      } else if (isBoxChar(initialChar)) {
        boxes.push({ type: initialChar, r, c });
        seenBoxTypes.add(initialChar);
      }

      if (isBoxChar(goalChar)) {
        boxGoals.push({ type: goalChar, r, c });
      } else if (isAgentChar(goalChar)) {
        agentGoals.push({ agent: Number(goalChar), r, c });
      }
    }
    walls.push(wallRow);
  }

  agents.sort((a, b) => a.id - b.id);
  boxes.sort((a, b) => a.type.localeCompare(b.type) || a.r - b.r || a.c - b.c);

  for (const agent of agents) {
    if (!agentColors[String(agent.id)]) warnings.push(`Agent ${agent.id} has no color assignment.`);
  }
  for (const type of seenBoxTypes) {
    if (!boxColors[type]) warnings.push(`Box ${type} has no color assignment.`);
  }

  return {
    name,
    domain,
    rows,
    cols,
    walls,
    agentColors,
    boxColors,
    colorAssignments,
    warnings,
    boxGoals,
    agentGoals,
    initial: { agents, boxes },
    sourcePath,
  };
}

function parseColorLine(line, agentColors, boxColors, colorAssignments, warnings) {
  const trimmed = line.trim();
  if (!trimmed) return;
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex < 0) return;

  const rawColor = trimmed.slice(0, colonIndex).trim();
  const color = normalizeColor(rawColor);
  if (!colors[color]) {
    warnings.push(`Unknown color "${rawColor}" ignored.`);
    return;
  }

  const objects = trimmed.slice(colonIndex + 1).split(',');
  if (!colorAssignments.has(color)) colorAssignments.set(color, new Set());
  for (const rawObject of objects) {
    const value = rawObject.trim();
    if (!value) continue;
    const object = value[0];
    colorAssignments.get(color).add(object);
    if (isAgentChar(object)) {
      agentColors[String(Number(object))] = color;
    } else if (isBoxChar(object)) {
      boxColors[object] = color;
    }
  }
}

function buildBoard() {
  const { rows, cols } = currentLevel;
  rebuildAxes(rows, cols);
  els.boards.classList.remove('empty');
  removeEmptyMessage();
}

function render() {
  if (!currentLevel) {
    els.panSurface.innerHTML = '';
    els.boards.classList.add('empty');
    els.hoverInfo.textContent = '(row, col)';
    els.levelTitle.textContent = '';
    els.meta.textContent = '';
    clearDetails();
    showEmptyMessage(levelEntries.length > 0
      ? 'Choose a level from the list to render it.'
      : 'Read a .lvl file or add a directory to begin.');
    renderLevelList();
    return;
  }

  els.boards.classList.remove('empty');
  removeEmptyMessage();

  const level = currentLevel;
  const goals = goalMap(level);
  const agents = new Map(level.initial.agents.map(agent => [`${agent.r},${agent.c}`, agent]));
  const boxes = new Map(level.initial.boxes.map(box => [`${box.r},${box.c}`, box]));
  const track = trackedCells(level);
  const coord = highlightCoord;

  renderBoardOnly();
  renderMeta(level);
  renderDetails(level);
  renderLevelList();
}

function renderBoardOnly() {
  if (!currentLevel) return;
  const level = currentLevel;
  const goals = goalMap(level);
  const agents = new Map(level.initial.agents.map(agent => [`${agent.r},${agent.c}`, agent]));
  const boxes = new Map(level.initial.boxes.map(box => [`${box.r},${box.c}`, box]));
  const track = trackedCells(level);
  const coord = highlightCoord;

  const card = document.createElement('div');
  card.className = 'boardCard';
  card.appendChild(createBoardCanvas(level, goals, agents, boxes, track, coord));

  els.panSurface.innerHTML = '';
  els.panSurface.appendChild(card);
  els.statusInfo.textContent = `Rendered ${level.rows}x${level.cols}`;
}

function createBoardCanvas(level, goals, agents, boxes, track, coord) {
  const cell = Math.max(5, Math.round(BASE_CELL * state.zoom));
  const gap = 1;
  const width = level.cols * cell + (level.cols + 1) * gap;
  const height = level.rows * cell + (level.rows + 1) * gap;
  const pixelRatio = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.className = 'boardCanvas';
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.dataset.rows = String(level.rows);
  canvas.dataset.cols = String(level.cols);
  canvas.dataset.cell = String(cell);
  canvas.dataset.gap = String(gap);
  canvas.dataset.pixelRatio = String(pixelRatio);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  ctx.fillStyle = '#404040';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.max(8, Math.round(cell * 0.6))}px MavisMono, Consolas, monospace`;

  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const key = `${r},${c}`;
      const x = gap + c * (cell + gap);
      const y = gap + r * (cell + gap);
      const wall = level.walls[r][c] === '+';
      const goal = goals.get(key);
      const box = boxes.get(key);
      const agent = agents.get(key);

      let fill = wall ? '#000000' : '#c0c0c0';
      if (!wall && goal) {
        fill = isGoalSatisfied(level, r, c, goal) ? '#00a000' : '#dfdf00';
      }
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, cell, cell);

      if (!wall && goal) {
        ctx.fillStyle = isGoalSatisfied(level, r, c, goal) ? '#003a00' : '#434300';
        ctx.fillText(goal.label, x + cell / 2, y + cell / 2 + 1);
      }

      if (track.has(key)) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = Math.max(2, Math.round(cell * 0.08));
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      }

      if (coord && coord.r === r && coord.c === c) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = Math.max(2, Math.round(cell * 0.08));
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, Math.max(4, cell / 2 + 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (box) {
        drawToken(ctx, box.type, objectColor(level.boxColors[box.type]), x, y, cell, false);
      }
      if (agent) {
        drawToken(ctx, String(agent.id), objectColor(level.agentColors[String(agent.id)]), x, y, cell, true);
      }
    }
  }

  return canvas;
}

function drawToken(ctx, text, fill, x, y, cell, round) {
  const inset = Math.max(2, Math.round(cell * 0.07));
  const tokenX = x + inset;
  const tokenY = y + inset;
  const size = cell - inset * 2;
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  if (round) {
    ctx.beginPath();
    ctx.arc(x + cell / 2, y + cell / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(tokenX, tokenY, size, size);
    ctx.strokeRect(tokenX, tokenY, size, size);
  }
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x + cell / 2, y + cell / 2 + 1);
}

function renderMeta(level) {
  const parts = [
    `<b>${escapeHtml(level.name)}</b>`,
    `${level.rows}x${level.cols}, ${level.initial.agents.length} agents, ${level.initial.boxes.length} boxes`,
    `${level.boxGoals.length} box goals, ${level.agentGoals.length} agent goals`,
  ];
  if (level.sourcePath) parts.push(escapeHtml(level.sourcePath));
  if (level.warnings.length > 0) {
    parts.push(`<span class="warningLine">${escapeHtml(level.warnings[0])}${level.warnings.length > 1 ? ` (+${level.warnings.length - 1})` : ''}</span>`);
  }
  els.meta.innerHTML = parts.join('<br>');
  els.levelTitle.textContent = level.name;
}

function renderDetails(level) {
  const freeCells = level.rows * level.cols - countWalls(level);
  const assignedColorCount = level.colorAssignments.size;
  const rows = [
    ['Domain', level.domain || 'unknown'],
    ['Source', level.sourcePath || 'file'],
    ['Free cells', String(freeCells)],
    ['Walls', String(countWalls(level))],
    ['Agents', level.initial.agents.map(agent => `agent${agent.id}`).join(', ') || 'none'],
    ['Boxes', summarizeTypes(level.initial.boxes.map(box => box.type)) || 'none'],
    ['Goals', `${level.boxGoals.length + level.agentGoals.length}`],
    ['Colors', String(assignedColorCount)],
  ];

  const details = document.createElement('div');
  details.id = 'details';
  details.className = 'detailsPanel';
  details.hidden = false;
  if (els.detailsSection) els.detailsSection.hidden = false;

  const grid = document.createElement('dl');
  grid.className = 'detailGrid';
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    grid.append(dt, dd);
  }
  details.appendChild(grid);

  if (level.colorAssignments.size > 0) {
    const title = document.createElement('div');
    title.className = 'miniInfo';
    title.textContent = 'Color assignments';
    details.appendChild(title);

    const list = document.createElement('div');
    list.className = 'colorList';
    for (const [color, objects] of [...level.colorAssignments.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const row = document.createElement('div');
      row.className = 'colorRow';
      const swatch = document.createElement('span');
      swatch.className = 'colorSwatch';
      swatch.style.background = objectColor(color);
      const name = document.createElement('strong');
      name.textContent = color.toLowerCase();
      const values = document.createElement('span');
      values.textContent = [...objects].sort().join(', ');
      row.append(swatch, name, values);
      list.appendChild(row);
    }
    details.appendChild(list);
  }

  els.details.replaceWith(details);
  els.details = details;
}

function clearDetails() {
  els.details.textContent = '';
  els.details.className = '';
  els.details.hidden = true;
  if (els.detailsSection) els.detailsSection.hidden = true;
}

function renderLevelList() {
  const filtered = filteredLevelEntries();
  const groups = groupedEntries(filtered);
  syncOpenDirectorySource(groups);

  els.levelList.innerHTML = '';
  els.levelList.classList.toggle('singleDirectory', groups.length === 1);
  for (const group of groups) {
    const isOpen = group.source === openDirectorySource;
    const card = document.createElement('section');
    card.className = `directoryCard${isOpen ? ' open' : ' collapsed'}`;

    const header = document.createElement('div');
    header.className = 'directoryCardHeader';
    const title = document.createElement('strong');
    title.textContent = group.source;
    const count = document.createElement('span');
    count.textContent = `${group.entries.length} level${group.entries.length === 1 ? '' : 's'}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'directoryToggleBtn';
    toggle.dataset.directorySource = group.source;
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.title = isOpen ? 'Collapse directory' : 'Show directory';
    toggle.textContent = isOpen ? 'v' : '>';
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      toggleDirectory(group.source);
    });
    header.append(title, count, toggle);

    const rows = document.createElement('div');
    rows.className = 'directoryLevels';
    rows.hidden = !isOpen;
    for (const entry of group.entries) {
      const row = document.createElement('div');
      row.className = `levelRow${entry.id === selectedEntryId ? ' active' : ''}`;
      row.title = entry.path;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'levelRowMain';
      button.dataset.entryId = entry.id;

      const name = document.createElement('strong');
      name.textContent = entry.fileName || fileName(entry.path) || `${entry.name}.lvl`;
      button.append(name);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'levelDeleteBtn';
      deleteButton.dataset.entryDeleteId = entry.id;
      deleteButton.title = `Remove ${name.textContent} from list`;
      deleteButton.setAttribute('aria-label', `Remove ${name.textContent} from list`);
      deleteButton.textContent = 'x';

      row.append(button, deleteButton);
      rows.appendChild(row);
    }

    card.append(header, rows);
    els.levelList.appendChild(card);
  }

  if (levelEntries.length === 0) {
    els.libraryInfo.textContent = 'Add a directory to list .lvl files here.';
  } else if (filtered.length === 0) {
    els.libraryInfo.textContent = `No matches in ${levelEntries.length} read levels.`;
  } else if (groups.length > 1) {
    const openGroup = groups.find(group => group.source === openDirectorySource);
    els.libraryInfo.textContent = openGroup
      ? `${filtered.length}/${levelEntries.length} matches. Showing ${openGroup.source}.`
      : `${filtered.length}/${levelEntries.length} matches. All directories collapsed.`;
  } else {
    els.libraryInfo.textContent = `${filtered.length}/${levelEntries.length} levels shown.`;
  }
  updateLevelNavButtons(filtered);
}

function filteredLevelEntries() {
  const query = normalizeText(els.levelSearchInput.value);
  return levelEntries.filter(entry => levelMatchesQuery(entry, query));
}

function levelMatchesQuery(entry, query) {
  if (!query) return true;
  return normalizeText(`${entry.name} ${entry.path} ${entry.source}`).includes(query);
}

function updateLevelNavButtons(filtered = filteredLevelEntries()) {
  const disabled = filtered.length <= 1;
  els.prevLevelBtn.disabled = disabled;
  els.nextLevelBtn.disabled = disabled;
}

function switchLevel(direction) {
  const filtered = filteredLevelEntries();
  if (filtered.length === 0) {
    showError('No levels match the current filter.', 'No level to switch');
    return;
  }

  const currentIndex = filtered.findIndex(entry => entry.id === selectedEntryId);
  let nextIndex;
  if (currentIndex < 0) {
    nextIndex = direction < 0 ? filtered.length - 1 : 0;
  } else {
    nextIndex = (currentIndex + direction + filtered.length) % filtered.length;
  }
  loadEntry(filtered[nextIndex], { scrollBoard: false });
}

function scrollActiveLevelIntoView() {
  requestAnimationFrame(() => {
    const active = els.levelList.querySelector('.levelRow.active');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  });
}

function toggleDirectory(source) {
  if (!source) return;
  if (openDirectorySource === source) {
    openDirectorySource = null;
    directoryAutoOpen = false;
  } else {
    openDirectorySource = source;
    directoryAutoOpen = true;
  }
  renderLevelList();
}

function syncOpenDirectorySource(groups) {
  if (groups.length === 0) {
    openDirectorySource = null;
    return;
  }

  if (openDirectorySource && groups.some(group => group.source === openDirectorySource)) {
    return;
  }

  if (!directoryAutoOpen) {
    openDirectorySource = null;
    return;
  }

  if (selectedEntryId) {
    const selectedGroup = groups.find(group => group.entries.some(entry => entry.id === selectedEntryId));
    if (selectedGroup) {
      openDirectorySource = selectedGroup.source;
      return;
    }
  }

  openDirectorySource = groups[0].source;
}

function renderCurrentLevel() {
  if (!currentLevel) {
    render();
    return;
  }
  buildBoard();
  render();
}

function groupedEntries(entries) {
  const bySource = new Map();
  for (const entry of entries) {
    const source = entry.source || 'Levels';
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(entry);
  }
  return [...bySource.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
    .map(([source, sourceEntries]) => ({
      source,
      entries: sourceEntries.sort((a, b) => (a.fileName || a.path).localeCompare(b.fileName || b.path, undefined, { sensitivity: 'base' })),
    }));
}

function removeEmptyMessage() {
  for (const element of els.boardWrap.querySelectorAll(':scope > .emptyMessage')) {
    element.remove();
  }
}

function showEmptyMessage(message) {
  removeEmptyMessage();
  const empty = document.createElement('div');
  empty.className = 'emptyMessage';
  empty.textContent = message;
  els.boardWrap.appendChild(empty);
}

function rebuildAxes(rows, cols) {
  els.axisTopInner.innerHTML = '';
  els.axisLeftInner.innerHTML = '';
  els.axisTopInner.style.gridTemplateColumns = `repeat(${cols}, var(--axis))`;
  els.axisTopInner.style.gridTemplateRows = 'var(--axis)';
  els.axisLeftInner.style.gridTemplateColumns = 'var(--axis)';
  els.axisLeftInner.style.gridTemplateRows = `repeat(${rows}, var(--axis))`;
  for (let c = 0; c < cols; c++) els.axisTopInner.appendChild(div('axisCell', String(c)));
  for (let r = 0; r < rows; r++) els.axisLeftInner.appendChild(div('axisCell', String(r)));
}

function applyZoom() {
  const cell = Math.max(5, Math.round(BASE_CELL * state.zoom));
  document.documentElement.style.setProperty('--cell', `${cell}px`);
  document.documentElement.style.setProperty('--axis', `${cell}px`);
  els.zoomInfo.textContent = `${Math.round(state.zoom * 100)}%`;
}

function applyPan() {
  const tx = `${Math.round(state.pan.x)}px`;
  const ty = `${Math.round(state.pan.y)}px`;
  els.panSurface.style.transform = `translate(${tx}, ${ty})`;
  els.axisTopInner.style.transform = `translateX(${tx})`;
  els.axisLeftInner.style.transform = `translateY(${ty})`;
}

function startPanDrag(event) {
  if (!currentLevel || els.boards.classList.contains('empty')) return;
  if (event.button !== 0) return;
  panDrag.active = true;
  panDrag.pointerId = event.pointerId;
  panDrag.startX = event.clientX;
  panDrag.startY = event.clientY;
  panDrag.originX = state.pan.x;
  panDrag.originY = state.pan.y;
  els.boards.classList.add('panning');
  els.hoverTip.classList.remove('show');
  if (els.boards.setPointerCapture) {
    try {
      els.boards.setPointerCapture(event.pointerId);
    } catch (_) {
      // Pointer capture is only a smoothness improvement here.
    }
  }
  event.preventDefault();
}

function updatePanDrag(event) {
  if (!panDrag.active || event.pointerId !== panDrag.pointerId) return;
  state.pan.x = panDrag.originX + event.clientX - panDrag.startX;
  state.pan.y = panDrag.originY + event.clientY - panDrag.startY;
  applyPan();
  event.preventDefault();
}

function endPanDrag(event) {
  if (!panDrag.active) return;
  if (event.pointerId !== undefined && panDrag.pointerId !== null && event.pointerId !== panDrag.pointerId) return;
  panDrag.active = false;
  const pointerId = panDrag.pointerId;
  panDrag.pointerId = null;
  els.boards.classList.remove('panning');
  if (pointerId !== null && els.boards.releasePointerCapture && els.boards.hasPointerCapture?.(pointerId)) {
    els.boards.releasePointerCapture(pointerId);
  }
}

function resetView() {
  state.zoom = 1;
  applyZoom();
  if (!currentLevel) {
    state.pan.x = 0;
    state.pan.y = 0;
    applyPan();
    return;
  }
  requestAnimationFrame(() => {
    const card = els.panSurface.firstElementChild;
    if (!card) return;
    const boardW = card.offsetWidth;
    const boardH = card.offsetHeight;
    const viewportW = els.panViewport.clientWidth;
    const viewportH = els.panViewport.clientHeight;
    state.pan.x = boardW <= viewportW ? Math.round((viewportW - boardW) / 2) : 0;
    state.pan.y = boardH <= viewportH ? Math.round((viewportH - boardH) / 2) : 0;
    applyPan();
    ensureBoardIsVisible();
  });
}

function ensureBoardIsVisible() {
  const card = els.panSurface.firstElementChild;
  if (!card) return;
  const boardW = card.offsetWidth;
  const boardH = card.offsetHeight;
  const viewportW = els.panViewport.clientWidth;
  const viewportH = els.panViewport.clientHeight;

  if (state.pan.x > viewportW - 24 || state.pan.x + boardW < 24) {
    state.pan.x = boardW <= viewportW ? Math.round((viewportW - boardW) / 2) : 0;
  }
  if (state.pan.y > viewportH - 24 || state.pan.y + boardH < 24) {
    state.pan.y = boardH <= viewportH ? Math.round((viewportH - boardH) / 2) : 0;
  }
  applyPan();
}

function zoomAt(clientX, clientY, factor) {
  const newZoom = clamp(state.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const realFactor = newZoom / state.zoom;
  if (realFactor === 1) return;

  const rect = els.panViewport.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  state.pan.x = mx - (mx - state.pan.x) * realFactor;
  state.pan.y = my - (my - state.pan.y) * realFactor;
  state.zoom = newZoom;
  applyZoom();
  renderBoardOnly();
  applyPan();
}

function centerOn(r, c, resetZoom = false) {
  if (!currentLevel) return;
  if (resetZoom) {
    state.zoom = 1;
    applyZoom();
  }
  requestAnimationFrame(() => {
    const cellSize = Math.round(BASE_CELL * state.zoom);
    const cellCenterX = 1 + c * (cellSize + 1) + cellSize / 2;
    const cellCenterY = 1 + r * (cellSize + 1) + cellSize / 2;
    state.pan.x = Math.round(els.panViewport.clientWidth / 2 - cellCenterX);
    state.pan.y = Math.round(els.panViewport.clientHeight / 2 - cellCenterY);
    applyPan();
  });
}

function goToCoordinate() {
  const coord = parseCoord(els.coordInput.value);
  if (!coord || !currentLevel) {
    highlightCoord = null;
    render();
    return;
  }
  if (coord.r < 0 || coord.c < 0 || coord.r >= currentLevel.rows || coord.c >= currentLevel.cols) {
    showError(`Coordinate (${coord.r}, ${coord.c}) is outside this level.`, 'Coordinate outside board');
    return;
  }
  highlightCoord = coord;
  centerOn(coord.r, coord.c, false);
  render();
}

function updateHover(event) {
  if (!currentLevel || panDrag.active) return;
  const canvas = event.target.closest?.('.boardCanvas');
  if (canvas && els.boards.contains(canvas)) {
    const coord = canvasCellAt(canvas, event);
    if (!coord) {
      hideHover();
      return;
    }
    const parts = describeCell(currentLevel, coord.r, coord.c);
    els.hoverInfo.textContent = parts.join(' | ');
    els.hoverTip.innerHTML = `<strong>${escapeHtml(`(${coord.r}, ${coord.c})`)}</strong>${parts.length > 1 ? ` <span>${escapeHtml(parts.slice(1).join(' | '))}</span>` : ''}`;
    positionHoverTip(event);
    return;
  }

  const cell = event.target.closest?.('.cell');
  if (!cell || !els.boards.contains(cell)) {
    hideHover();
    return;
  }
  const r = Number(cell.dataset.r);
  const c = Number(cell.dataset.c);
  const parts = [`(${r}, ${c})`];
  if (cell.dataset.wall === 'true') parts.push('wall');
  if (cell.dataset.goal) parts.push(`goal ${cell.dataset.goal}`);
  if (cell.dataset.box) parts.push(`box${cell.dataset.box}`);
  if (cell.dataset.agent) parts.push(`agent${cell.dataset.agent}`);
  els.hoverInfo.textContent = parts.join(' | ');
  els.hoverTip.innerHTML = `<strong>${escapeHtml(`(${r}, ${c})`)}</strong>${parts.length > 1 ? ` <span>${escapeHtml(parts.slice(1).join(' | '))}</span>` : ''}`;
  positionHoverTip(event);
}

function positionHoverTip(event) {
  const rect = els.boards.getBoundingClientRect();
  const x = Math.min(rect.width - 20, Math.max(8, event.clientX - rect.left + 12));
  const y = Math.min(rect.height - 20, Math.max(8, event.clientY - rect.top + 12));
  els.hoverTip.style.left = `${x}px`;
  els.hoverTip.style.top = `${y}px`;
  els.hoverTip.classList.add('show');
}

function hideHover() {
  els.hoverInfo.textContent = '(row, col)';
  els.hoverTip.classList.remove('show');
}

function canvasCellAt(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const cell = Number(canvas.dataset.cell) || Math.max(5, Math.round(BASE_CELL * state.zoom));
  const gap = Number(canvas.dataset.gap) || 1;
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const c = Math.floor((x - gap) / (cell + gap));
  const r = Math.floor((y - gap) / (cell + gap));
  if (r < 0 || c < 0 || r >= currentLevel.rows || c >= currentLevel.cols) return null;
  const localX = (x - gap) - c * (cell + gap);
  const localY = (y - gap) - r * (cell + gap);
  if (localX < 0 || localY < 0 || localX > cell || localY > cell) return null;
  return { r, c };
}

function describeCell(level, r, c) {
  const parts = [`(${r}, ${c})`];
  if (level.walls[r][c] === '+') parts.push('wall');
  const goals = goalMap(level);
  const goal = goals.get(`${r},${c}`);
  if (goal) parts.push(`goal ${goal.label}`);
  for (const box of level.initial.boxes) {
    if (box.r === r && box.c === c) parts.push(`box${box.type}`);
  }
  for (const agent of level.initial.agents) {
    if (agent.r === r && agent.c === c) parts.push(`agent${agent.id}`);
  }
  return parts;
}

function goalMap(level) {
  const out = new Map();
  for (const goal of level.boxGoals) out.set(`${goal.r},${goal.c}`, { kind: 'box', label: goal.type });
  for (const goal of level.agentGoals) out.set(`${goal.r},${goal.c}`, { kind: 'agent', label: String(goal.agent) });
  return out;
}

function isGoalSatisfied(level, r, c, goal) {
  if (goal.kind === 'box') {
    return level.initial.boxes.some(box => box.r === r && box.c === c && box.type === goal.label);
  }
  return level.initial.agents.some(agent => agent.r === r && agent.c === c && String(agent.id) === goal.label);
}

function trackedCells(level) {
  const query = els.trackInput.value.trim().toLowerCase();
  const out = new Set();
  if (!query) return out;

  const agentMatch = query.match(/^(?:agent)?(\d)$/);
  if (agentMatch) {
    const id = Number(agentMatch[1]);
    for (const agent of level.initial.agents) {
      if (agent.id === id) out.add(`${agent.r},${agent.c}`);
    }
    for (const goal of level.agentGoals) {
      if (goal.agent === id) out.add(`${goal.r},${goal.c}`);
    }
    return out;
  }

  const boxMatch = query.match(/^(?:box)?([a-z])$/);
  if (boxMatch) {
    const type = boxMatch[1].toUpperCase();
    for (const box of level.initial.boxes) {
      if (box.type === type) out.add(`${box.r},${box.c}`);
    }
    for (const goal of level.boxGoals) {
      if (goal.type === type) out.add(`${goal.r},${goal.c}`);
    }
  }
  return out;
}

function token(text, color, extraClass = '') {
  const element = document.createElement('span');
  element.className = extraClass ? `token ${extraClass}` : 'token';
  element.textContent = text;
  element.style.background = color;
  return element;
}

function objectColor(colorName) {
  return colors[normalizeColor(colorName)] || colors.DEFAULT;
}

function normalizeColor(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function countWalls(level) {
  let count = 0;
  for (const row of level.walls) {
    for (const char of row) if (char === '+') count++;
  }
  return count;
}

function summarizeTypes(types) {
  const counts = new Map();
  for (const type of types) counts.set(type, (counts.get(type) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => `${type}x${count}`)
    .join(', ');
}

function directoryRootName(file) {
  const path = file.webkitRelativePath || '';
  const [root] = path.split('/');
  return root || '';
}

function isLevelFile(file) {
  return Boolean(file?.name && file.name.toLowerCase().endsWith('.lvl'));
}

function stem(path) {
  const file = String(path || '').split(/[\\/]/).pop() || '';
  return file.replace(/\.[^.]+$/, '') || file || 'Level';
}

function fileName(path) {
  return String(path || '').split(/[\\/]/).pop() || '';
}

function parseCoord(text) {
  const match = String(text || '').trim().match(/^\(?\s*(\d+)\s*[, ]\s*(\d+)\s*\)?$/);
  if (!match) return null;
  return { r: Number(match[1]), c: Number(match[2]) };
}

function trimTrailingEmptyRows(rows) {
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
}

function charAt(line, index) {
  return index < line.length ? line[index] : ' ';
}

function isAgentChar(char) {
  return /^[0-9]$/.test(char);
}

function isBoxChar(char) {
  return /^[A-Z]$/.test(char);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function closestElement(target, selector) {
  let node = target;
  while (node && node !== document) {
    if (node instanceof Element && node.matches?.(selector)) return node;
    node = node.parentElement || node.parentNode;
  }
  return null;
}

function div(className, text) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function errorMessage(error) {
  return error && error.message ? error.message : String(error || 'Unknown error.');
}

function showError(message, title = 'Something needs attention') {
  showNotification(message, title);
}

function showNotice(message, title = 'Done') {
  showNotification(message, title);
}

function showNotification(message, title) {
  els.notificationTitle.textContent = title;
  els.notificationMessage.textContent = message;
  els.notificationToast.hidden = false;
  if (notificationTimer) window.clearTimeout(notificationTimer);
  notificationTimer = window.setTimeout(clearNotification, 5000);
}

function clearNotification() {
  els.notificationToast.hidden = true;
  els.notificationTitle.textContent = 'Something needs attention';
  els.notificationMessage.textContent = '';
  if (notificationTimer) window.clearTimeout(notificationTimer);
  notificationTimer = null;
}

function localStorageAvailable() {
  try {
    const key = 'aims-level-viewer:storage-test';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}
