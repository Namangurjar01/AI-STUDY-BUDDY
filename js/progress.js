import { getSignedInUser, getQuizResults, getFlashcardProgress } from './firestore-data.js';

const demoWeeklyMinutes = [28, 42, 35, 60, 54, 72, 27];
const demoQuizScores = [72, 78, 74, 88, 82, 90, 84];
const demoQuizCount = 18;
const demoFlashcardCount = 42;
const overallProgress = 72;
const completedTopics = 12;
const totalTopics = 18;
const topicProgress = [
  { name: 'Data Structures', percent: 100, color: 'green' },
  { name: 'Cell Biology', percent: 100, color: 'coral' },
  { name: 'Learning Science', percent: 80, color: 'blue' },
  { name: 'Calculus', percent: 67, color: 'gold' },
  { name: 'Chemistry', percent: 50, color: 'rose' },
  { name: 'Psychology', percent: 33, color: 'teal' },
];

function readQuizHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('studyBuddyQuizHistory') || '[]');
    return Array.isArray(history)
      ? history.filter((attempt) => Number.isFinite(Number(attempt.score)) && Number(attempt.score) >= 0 && Number(attempt.score) <= 100)
      : [];
  } catch {
    return [];
  }
}

function readStoredNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function renderWeeklyChart() {
  const chart = document.querySelector('#weekly-bar-chart');
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const currentDay = (new Date().getDay() + 6) % 7;
  const maximumMinutes = Math.max(...demoWeeklyMinutes);
  const totalMinutes = demoWeeklyMinutes.reduce((total, minutes) => total + minutes, 0);

  document.querySelector('#weekly-total').textContent = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  chart.replaceChildren();

  demoWeeklyMinutes.forEach((minutes, index) => {
    const dayColumn = document.createElement('div');
    dayColumn.className = `weekly-day-column ${index === currentDay ? 'is-today' : ''}`;
    dayColumn.setAttribute('aria-label', `${weekDays[index]}: ${minutes} focused study minutes`);
    const barArea = document.createElement('div');
    barArea.className = 'weekly-bar-area';
    const value = document.createElement('span');
    value.className = 'weekly-bar-value';
    value.textContent = String(minutes);
    const bar = document.createElement('span');
    bar.className = 'weekly-bar';
    bar.style.height = `${Math.max(9, (minutes / maximumMinutes) * 100)}%`;
    bar.title = `${minutes} minutes`;
    const label = document.createElement('span');
    label.className = 'weekly-day-label';
    label.textContent = weekDays[index];
    barArea.append(value, bar);
    dayColumn.append(barArea, label);
    chart.append(dayColumn);
  });
}

function renderQuizPerformance(history, reviewedCount = null) {
  const chart = document.querySelector('#quiz-performance-chart');
  const scoreSeries = history.length
    ? history.slice(-6).map((attempt) => Number(attempt.percentage ?? attempt.score))
    : demoQuizScores;
  const average = history.length
    ? Math.round(history.reduce((sum, attempt) => sum + Number(attempt.percentage ?? attempt.score), 0) / history.length)
    : 84;
  const quizCount = history.length || demoQuizCount;
  const flashcardsReviewed = reviewedCount ?? (readStoredNumber('studyBuddyFlashcardsReviewed') || demoFlashcardCount);

  document.querySelector('#quiz-average').textContent = `${average}%`;
  document.querySelector('#quiz-average-bar').style.width = `${average}%`;
  document.querySelector('#quizzes-completed').textContent = String(quizCount);
  document.querySelector('#quiz-count-note').textContent = history.length ? 'Completed on this device' : 'Sample activity';
  document.querySelector('#flashcards-reviewed').textContent = String(flashcardsReviewed);
  document.querySelector('#overall-progress-value').textContent = `${overallProgress}%`;
  document.querySelector('#overall-progress-ring').style.setProperty('--overall-progress', `${overallProgress}%`);
  document.querySelector('#overall-progress-ring').setAttribute('aria-valuenow', String(overallProgress));
  document.querySelector('#topics-completed').textContent = String(completedTopics);
  document.querySelector('#topic-completion-total').textContent = String(completedTopics);

  const scoreChange = scoreSeries.length > 1 ? scoreSeries[scoreSeries.length - 1] - scoreSeries[scoreSeries.length - 2] : 0;
  document.querySelector('#quiz-trend').textContent = `${scoreChange >= 0 ? '+' : ''}${scoreChange}%`;
  chart.replaceChildren();

  scoreSeries.forEach((score, index) => {
    const row = document.createElement('div');
    row.className = 'quiz-score-row';
    const label = document.createElement('span');
    label.className = 'quiz-score-label';
    label.textContent = history.length ? `Quiz ${Math.max(1, history.length - scoreSeries.length + index + 1)}` : `Quiz ${index + 1}`;
    const track = document.createElement('span');
    track.className = 'quiz-score-track';
    const bar = document.createElement('span');
    bar.className = 'quiz-score-bar';
    bar.style.width = `${score}%`;
    track.append(bar);
    const scoreLabel = document.createElement('strong');
    scoreLabel.className = 'quiz-score-value';
    scoreLabel.textContent = `${score}%`;
    row.append(label, track, scoreLabel);
    chart.append(row);
  });
}

function renderTopics() {
  const topicList = document.querySelector('#topic-list');
  topicProgress.forEach((topic) => {
    const row = document.createElement('div');
    row.className = 'topic-progress-row';
    const heading = document.createElement('div');
    heading.className = 'topic-progress-heading';
    const name = document.createElement('span');
    name.textContent = topic.name;
    const score = document.createElement('strong');
    score.textContent = `${topic.percent}%`;
    heading.append(name, score);
    const track = document.createElement('div');
    track.className = 'topic-progress-track';
    const bar = document.createElement('span');
    bar.className = `topic-progress-bar topic-${topic.color}`;
    bar.style.width = `${topic.percent}%`;
    track.append(bar);
    row.append(heading, track);
    topicList.append(row);
  });
}

const today = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());
document.querySelector('#progress-date').textContent = today.toUpperCase();

renderWeeklyChart();
renderQuizPerformance(readQuizHistory());
renderTopics();

async function loadCloudProgress() {
  const user = await getSignedInUser();
  if (!user) return;

  try {
    const [quizResults, flashcardProgress] = await Promise.all([
      getQuizResults(user, 1000),
      getFlashcardProgress(user),
    ]);
    const history = quizResults.length ? quizResults : readQuizHistory();
    const reviewedCount = flashcardProgress && Number.isFinite(Number(flashcardProgress.reviewed))
      ? Number(flashcardProgress.reviewed)
      : null;
    renderQuizPerformance(history, reviewedCount);
  } catch {
    // The demo charts remain visible if Firestore has not been set up yet.
  }
}

loadCloudProgress();
