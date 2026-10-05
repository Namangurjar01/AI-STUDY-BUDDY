import { getSignedInUser, getStudyMaterials, getQuizResults } from './firestore-data.js';

function readLocalList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const sampleMaterials = [
  { name: 'Cell Biology — Cell Structure.pdf', subject: 'Biology', date: 'Today · 10:42 AM', icon: 'PDF', status: 'Summary ready', href: 'quiz.html' },
  { name: 'Foundations of Chemistry.pdf', subject: 'Chemistry', date: 'Yesterday · 4:18 PM', icon: 'PDF', status: 'In progress', href: 'upload.html' },
  { name: 'Calculus — Derivatives & Limits', subject: 'Mathematics · Notes', date: 'May 17 · 1:05 PM', icon: 'NOTE', status: 'Ready to review', href: 'flashcards.html' },
];

function createMaterialRow(material) {
  const row = document.createElement('a');
  row.className = 'material-row';
  row.href = material.href;
  row.dataset.searchable = '';
  row.dataset.search = `${material.name} ${material.subject} ${material.status}`.toLowerCase();

  const fileIcon = document.createElement('span');
  fileIcon.className = `material-file-icon ${material.icon === 'NOTE' ? 'notes-icon' : ''}`;
  fileIcon.textContent = material.icon;
  const info = document.createElement('span');
  info.className = 'material-info';
  const title = document.createElement('strong');
  title.textContent = material.name;
  const detail = document.createElement('small');
  detail.textContent = `${material.subject} · ${material.date}`;
  info.append(title, detail);
  const meta = document.createElement('span');
  meta.className = 'material-meta';
  const status = document.createElement('span');
  status.className = 'material-status';
  status.textContent = material.status;
  const arrow = document.createElement('span');
  arrow.className = 'material-action';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  meta.append(status, arrow);
  row.append(fileIcon, info, meta);
  return row;
}

const savedNotes = readLocalList('studyBuddyNotes');
const personalMaterials = savedNotes.slice(-2).reverse().map((note) => ({
  name: String(note.name || 'Untitled notes'),
  subject: 'Your local notes',
  date: 'Recently added',
  icon: 'NOTE',
  status: 'Saved on this device',
  href: 'upload.html',
}));
const materialList = document.querySelector('#material-list');
[...personalMaterials, ...sampleMaterials].forEach((material) => {
  materialList.append(createMaterialRow(material));
});

function displayUploadDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  return date ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date) : 'Recently added';
}

async function loadCloudDashboardData() {
  const user = await getSignedInUser();
  if (!user) return;

  try {
    const [materials, quizResults] = await Promise.all([
      getStudyMaterials(user, 8),
      getQuizResults(user, 1),
    ]);

    if (materials.length) {
      materialList.replaceChildren();
      materials.forEach((material) => {
        materialList.append(createMaterialRow({
          name: material.title || material.fileName || 'Study material',
          subject: Array.isArray(material.topics) && material.topics.length ? material.topics.join(', ') : 'Your study material',
          date: displayUploadDate(material.uploadDate),
          icon: 'PDF',
          status: material.summary ? 'Summary ready' : 'Ready to review',
          href: 'upload.html',
        }));
      });
    }

    if (quizResults.length) {
      const latestResult = quizResults[0];
      const latestScore = Number(latestResult.percentage) || 0;
      document.querySelector('#dashboard-quiz-score').textContent = `${latestScore}%`;
      document.querySelector('#quiz-score-bar').style.width = `${latestScore}%`;
      document.querySelector('#quiz-score-caption').textContent = 'Latest Firestore quiz result';
    }
  } catch {
    // The sample dashboard remains usable when Firestore is unavailable.
  }
}

loadCloudDashboardData();

const today = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());
document.querySelector('#dashboard-date').textContent = today.toUpperCase();

const latestQuiz = Number(localStorage.getItem('studyBuddyLatestQuiz'));
if (Number.isFinite(latestQuiz) && latestQuiz >= 0 && latestQuiz <= 100) {
  document.querySelector('#dashboard-quiz-score').textContent = `${latestQuiz}%`;
  document.querySelector('#quiz-score-bar').style.width = `${latestQuiz}%`;
  document.querySelector('#quiz-score-caption').textContent = 'Your latest sample quiz';
}

const searchInput = document.querySelector('#dashboard-search');
const searchableItems = document.querySelectorAll('[data-searchable]');
const materialEmpty = document.querySelector('#material-search-empty');
const recommendationEmpty = document.querySelector('#recommendation-search-empty');

function filterDashboard(query) {
  const searchTerm = query.trim().toLowerCase();
  let visibleMaterials = 0;
  let visibleRecommendations = 0;

  searchableItems.forEach((item) => {
    const matches = !searchTerm || item.dataset.search.includes(searchTerm);
    item.hidden = !matches;
    if (matches && item.classList.contains('material-row')) visibleMaterials += 1;
    if (matches && item.classList.contains('recommendation-item')) visibleRecommendations += 1;
  });

  materialEmpty.hidden = !searchTerm || visibleMaterials > 0;
  recommendationEmpty.hidden = !searchTerm || visibleRecommendations > 0;
}

searchInput.addEventListener('input', () => filterDashboard(searchInput.value));
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

const assistantForm = document.querySelector('#assistant-form');
const assistantQuestion = document.querySelector('#assistant-question');
const assistantResponse = document.querySelector('#assistant-response');

document.querySelectorAll('[data-question]').forEach((suggestion) => {
  suggestion.addEventListener('click', () => {
    assistantQuestion.value = suggestion.dataset.question;
    assistantQuestion.focus();
  });
});

assistantForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = assistantQuestion.value.trim();
  if (!question) {
    assistantResponse.textContent = 'Type a question or choose one of the suggestions above.';
    assistantQuestion.focus();
    return;
  }

  assistantResponse.textContent = `Demo mode: “${question}” was not sent anywhere. AI answers are not connected yet.`;
});

const settingsDialog = document.querySelector('#settings-dialog');
const compactToggle = document.querySelector('#compact-mode');
const compactPreference = localStorage.getItem('studyBuddyCompactDashboard') === 'true';
compactToggle.checked = compactPreference;
document.body.classList.toggle('is-compact', compactPreference);

document.querySelector('#open-settings').addEventListener('click', () => settingsDialog.showModal());
compactToggle.addEventListener('change', () => {
  document.body.classList.toggle('is-compact', compactToggle.checked);
  localStorage.setItem('studyBuddyCompactDashboard', String(compactToggle.checked));
});
settingsDialog.addEventListener('click', (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});
