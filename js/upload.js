import { getSignedInUser, saveStudyMaterial, updateStudyMaterial, removeStudyMaterial, saveStudyActivity } from './firestore-data.js';
import { requestStudyBuddyAI } from './ai-api.js';
import { saveStudyGuide } from './study-context.js';

const fileInput = document.querySelector('#note-file');
const dropzone = document.querySelector('#pdf-dropzone');
const notesList = document.querySelector('#notes-list');
const notesCount = document.querySelector('#notes-count');
const uploadStatus = document.querySelector('#upload-status');
const selectedCard = document.querySelector('#selected-file-card');
const selectedName = document.querySelector('#selected-file-name');
const selectedSize = document.querySelector('#selected-file-size');
const readyStatus = document.querySelector('#file-ready-status');
const analyzeButton = document.querySelector('#analyze-button');
const progressPanel = document.querySelector('#analysis-progress');
const progressBar = document.querySelector('#analysis-progress-bar');
const progressPercent = document.querySelector('#analysis-percent');
const progressStep = document.querySelector('#analysis-step');
const resultPanel = document.querySelector('#analysis-result');
const resultFeedback = document.querySelector('#result-action-feedback');
const maximumFileSize = 20 * 1024 * 1024;
let selectedFile = null;
let selectedNoteId = null;
let selectedFirestoreId = null;
let analysisTimer = null;

function getNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem('studyBuddyNotes') || '[]');
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem('studyBuddyNotes', JSON.stringify(notes));
    return true;
  } catch {
    uploadStatus.textContent = 'Browser storage is full or unavailable. The file name was not saved.';
    return false;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderNotes() {
  const notes = getNotes();
  notesList.replaceChildren();
  notesCount.textContent = String(notes.length);

  if (!notes.length) {
    const empty = document.createElement('p');
    empty.className = 'saved-notes-empty';
    empty.textContent = 'Your saved PDF names will appear here.';
    notesList.append(empty);
    return;
  }

  notes.forEach((note) => {
    const row = document.createElement('div');
    row.className = 'saved-note-row';
    const name = document.createElement('span');
    name.textContent = note.name;
    const remove = document.createElement('button');
    remove.className = 'saved-note-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${note.name}`);
    remove.title = 'Remove saved file name';
    remove.addEventListener('click', () => removeSavedNote(note.id));
    row.append(name, remove);
    notesList.append(row);
  });
}

async function removeSavedNote(noteId) {
  const noteToRemove = getNotes().find((note) => note.id === noteId);
  const updatedNotes = getNotes().filter((note) => note.id !== noteId);
  if (!saveNotes(updatedNotes)) return;
  let cloudDeleteFailed = false;
  if (noteToRemove?.firestoreId) {
    try {
      const user = await getSignedInUser();
      if (user) await removeStudyMaterial(user, noteToRemove.firestoreId);
    } catch {
      cloudDeleteFailed = true;
    }
  }
  if (selectedNoteId === noteId) clearSelectedFile();
  uploadStatus.textContent = cloudDeleteFailed
    ? 'Removed from this browser. The cloud copy could not be removed.'
    : 'Saved file name removed.';
  renderNotes();
}

function resetAnalysis() {
  if (analysisTimer) window.clearInterval(analysisTimer);
  analysisTimer = null;
  progressPanel.hidden = true;
  resultPanel.hidden = true;
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';
  progressStep.textContent = 'Preparing your document...';
  analyzeButton.disabled = !selectedFile;
  analyzeButton.classList.remove('is-processing');
  readyStatus.classList.remove('is-analyzing');
  readyStatus.innerHTML = '<i></i> Ready to analyze';
}

function clearSelectedFile() {
  selectedFile = null;
  selectedNoteId = null;
  selectedFirestoreId = null;
  fileInput.value = '';
  selectedCard.hidden = true;
  uploadStatus.textContent = '';
  resetAnalysis();
}

async function selectPdf(file) {
  if (!file) return;
  resetAnalysis();
  resultFeedback.textContent = '';
  resultPanel.hidden = true;

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    uploadStatus.textContent = 'That file is not a PDF. Please choose a PDF file.';
    return;
  }
  if (file.size > maximumFileSize) {
    uploadStatus.textContent = 'This PDF is larger than 20 MB. Choose a smaller file.';
    return;
  }

  selectedFile = file;
  selectedNoteId = `${Date.now()}-${Math.random()}`;
  selectedFirestoreId = null;
  selectedName.textContent = file.name;
  selectedSize.textContent = formatFileSize(file.size);
  selectedCard.hidden = false;
  analyzeButton.disabled = false;
  const notes = getNotes();
  const localNote = { id: selectedNoteId, name: file.name };
  notes.push(localNote);
  if (saveNotes(notes)) renderNotes();

  uploadStatus.textContent = 'PDF selected. The file stays on your device.';
  try {
    const user = await getSignedInUser();
    if (user) {
      selectedFirestoreId = await saveStudyMaterial(user, {
        title: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
      });
      localNote.firestoreId = selectedFirestoreId;
      saveNotes(notes);
      uploadStatus.textContent = 'PDF selected. File stays on your device; study details are saved to your account.';
    }
  } catch {
    uploadStatus.textContent = 'PDF selected. File stays on your device; cloud metadata could not be saved.';
  }
}

fileInput.addEventListener('change', () => selectPdf(fileInput.files[0]));

document.querySelector('#remove-selected-file').addEventListener('click', () => {
  if (selectedNoteId) removeSavedNote(selectedNoteId);
  else clearSelectedFile();
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  });
});

dropzone.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer.files;
  selectPdf(file);
});

dropzone.addEventListener('keydown', (event) => {
  if (event.target === dropzone && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    fileInput.click();
  }
});

analyzeButton.addEventListener('click', async () => {
  if (!selectedFile || analysisTimer) return;
  const fileBeingAnalyzed = selectedFile;
  resultPanel.hidden = true;
  progressPanel.hidden = false;
  analyzeButton.disabled = true;
  analyzeButton.classList.add('is-processing');
  readyStatus.classList.add('is-analyzing');
  readyStatus.innerHTML = '<i></i> Analyzing';
  uploadStatus.textContent = '';

  let visibleProgress = 8;
  progressBar.style.width = `${visibleProgress}%`;
  progressPercent.textContent = `${visibleProgress}%`;
  progressStep.textContent = 'Sending your PDF securely for text extraction...';
  analysisTimer = window.setInterval(() => {
    visibleProgress = Math.min(visibleProgress + 3, 88);
    progressBar.style.width = `${visibleProgress}%`;
    progressPercent.textContent = `${visibleProgress}%`;
    if (visibleProgress > 28) progressStep.textContent = 'Reviewing the study material...';
    if (visibleProgress > 60) progressStep.textContent = 'Organizing key ideas...';
  }, 350);

  try {
    const result = await requestStudyBuddyAI('analyze-pdf', { file: fileBeingAnalyzed });
    if (selectedFile !== fileBeingAnalyzed) return;

    window.clearInterval(analysisTimer);
    analysisTimer = null;
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStep.textContent = 'Analysis complete';
    const studyGuide = {
      ...result,
      fileName: fileBeingAnalyzed.name,
      extractedText: result.extractedText || result.studyText || '',
      studyText: result.studyText || result.extractedText || '',
    };
    saveStudyGuide(studyGuide);
    const fileNameEl = document.querySelector('#result-file-name');
    const pageCountEl = document.querySelector('#result-page-count');
    const charCountEl = document.querySelector('#result-char-count');
    if (fileNameEl) fileNameEl.textContent = fileBeingAnalyzed.name;
    if (pageCountEl) pageCountEl.textContent = `${result.pageCount || 1} pages`;
    if (charCountEl) charCountEl.textContent = `${Number(studyGuide.studyText.length || 0).toLocaleString()} characters extracted`;

    if (selectedFirestoreId) {
      getSignedInUser()
        .then((user) => {
          if (!user) return;
          return Promise.all([
            updateStudyMaterial(user, selectedFirestoreId, {
              title: result.title || fileBeingAnalyzed.name.replace(/\.pdf$/i, ''),
              summary: result.summary || '',
              pageCount: result.pageCount || 0,
              characterCount: studyGuide.studyText.length || 0,
              topics: Array.isArray(result.topics) ? result.topics : [],
            }),
            saveStudyActivity(user, { activity: 'uploaded_document', documentId: selectedFirestoreId }),
          ]);
        })
        .catch(() => {});
    }

    progressPanel.hidden = true;
    resultPanel.hidden = false;
    readyStatus.classList.remove('is-analyzing');
    readyStatus.innerHTML = '<i></i> Analysis complete';
    uploadStatus.textContent = 'Study text extracted and AI study guide generated. The PDF is not stored by this app.';
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    if (analysisTimer) window.clearInterval(analysisTimer);
    analysisTimer = null;
    if (selectedFile === fileBeingAnalyzed) {
      progressPanel.hidden = true;
      progressBar.style.width = '0%';
      progressPercent.textContent = '0%';
      readyStatus.classList.remove('is-analyzing');
      readyStatus.innerHTML = '<i></i> Ready to analyze';
      uploadStatus.textContent = error.message || 'Something went wrong. Please try again.';
    }
  } finally {
    if (selectedFile === fileBeingAnalyzed) {
      analyzeButton.classList.remove('is-processing');
      analyzeButton.disabled = false;
    }
  }
});

document.querySelector('[data-result-action="summary"]').addEventListener('click', () => {
  window.location.href = 'summary.html';
});

renderNotes();
