import { getSignedInUser, getQuizResults, getFlashcardProgress } from './firestore-data.js';
import { readStudyGuide } from './study-context.js';

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function dayKey(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function renderWeeklyActivity(events) {
  const chart = document.querySelector('#weekly-bar-chart');
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const counts = days.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return events.filter((event) => dayKey(event) === dayKey(date)).length;
  });
  const maxCount = Math.max(1, ...counts);
  const weekTotal = counts.reduce((sum, count) => sum + count, 0);
  document.querySelector('#weekly-total').textContent = `${weekTotal} ${weekTotal === 1 ? 'activity' : 'activities'}`;
  chart.replaceChildren();
  counts.forEach((count, index) => {
    const column = document.createElement('div');
    column.className = `weekly-day-column ${index === (today.getDay() + 6) % 7 ? 'is-today' : ''}`;
    column.setAttribute('aria-label', `${days[index]}: ${count} study ${count === 1 ? 'activity' : 'activities'}`);
    const area = document.createElement('div');
    area.className = 'weekly-bar-area';
    const value = document.createElement('span');
    value.className = 'weekly-bar-value';
    value.textContent = String(count);
    const bar = document.createElement('span');
    bar.className = 'weekly-bar';
    bar.style.height = `${Math.max(6, (count / maxCount) * 100)}%`;
    bar.title = `${count} ${count === 1 ? 'activity' : 'activities'}`;
    const label = document.createElement('span');
    label.className = 'weekly-day-label';
    label.textContent = days[index];
    area.append(value, bar);
    column.append(area, label);
    chart.append(column);
  });
}

function renderQuizStats(history, reviewedCount) {
  const scores = history
    .map((item) => Number(item.percentage ?? item.score))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 100);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  document.querySelector('#quiz-average').textContent = scores.length ? `${average}%` : '—';
  document.querySelector('#quiz-average-bar').style.width = `${average}%`;
  document.querySelector('#quizzes-completed').textContent = String(history.length);
  document.querySelector('#quiz-count-note').textContent = history.length ? 'Your completed quizzes' : 'Complete a quiz to begin';
  document.querySelector('#flashcards-reviewed').textContent = String(reviewedCount);
  document.querySelector('#overall-progress-value').textContent = scores.length ? `${average}%` : '—';
  document.querySelector('#overall-progress-ring').style.setProperty('--overall-progress', `${average}%`);
  document.querySelector('#overall-progress-ring').setAttribute('aria-valuenow', String(average));
  const guideTopics = readStudyGuide()?.topics;
  const topics = [...new Set((Array.isArray(guideTopics) ? guideTopics : [])
    .map((topic) => String(topic).trim()).filter(Boolean))];
  document.querySelector('#topics-completed').textContent = String(topics.length);
  document.querySelector('#topic-completion-total').textContent = String(topics.length);
  document.querySelector('#topics-note').textContent = topics.length ? 'Extracted from your latest guide' : 'Analyze a PDF to find topics';
  document.querySelector('.progress-hero-copy > p').textContent = history.length
    ? `You have completed ${history.length} ${history.length === 1 ? 'quiz' : 'quizzes'}. Keep practicing to build a steady study routine.`
    : 'Complete a quiz or review flashcards and your study activity will appear here.';
  document.querySelector('#quiz-trend').textContent = scores.length > 1
    ? `${scores.at(-1) - scores.at(-2) >= 0 ? '+' : ''}${scores.at(-1) - scores.at(-2)}%`
    : '—';
  const chart = document.querySelector('#quiz-performance-chart');
  chart.replaceChildren();
  scores.slice(-6).forEach((score, index, recent) => {
    const row = document.createElement('div');
    row.className = 'quiz-score-row';
    const label = document.createElement('span');
    label.className = 'quiz-score-label';
    label.textContent = `Quiz ${Math.max(1, scores.length - recent.length + index + 1)}`;
    const track = document.createElement('span');
    track.className = 'quiz-score-track';
    const bar = document.createElement('span');
    bar.className = 'quiz-score-bar';
    bar.style.width = `${score}%`;
    track.append(bar);
    const value = document.createElement('strong');
    value.className = 'quiz-score-value';
    value.textContent = `${score}%`;
    row.append(label, track, value);
    chart.append(row);
  });
  if (!scores.length) chart.textContent = 'Your quiz scores will appear here after your first quiz.';
  const topicList = document.querySelector('#topic-list');
  topicList.replaceChildren();
  if (!topics.length) {
    const topicMessage = document.createElement('p');
    topicMessage.textContent = 'Analyze a study PDF to see its key topics here.';
    topicList.append(topicMessage);
  } else {
    topics.forEach((topic) => {
      const item = document.createElement('div');
      item.className = 'topic-progress-row';
      const heading = document.createElement('div');
      heading.className = 'topic-progress-heading';
      const name = document.createElement('span');
      name.textContent = topic;
      heading.append(name);
      item.append(heading);
      topicList.append(item);
    });
  }
}

function renderStreak(events) {
  const today = new Date();
  const activeDays = new Set(events.map(dayKey).filter(Boolean));
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  document.querySelector('#study-streak').textContent = String(streak);
  const week = document.querySelector('#streak-week');
  week.replaceChildren();
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  labels.forEach((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const day = document.createElement('i');
    day.textContent = label;
    if (activeDays.has(dayKey(date))) day.className = index === (today.getDay() + 6) % 7 ? 'current' : 'complete';
    week.append(day);
  });
}

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
document.querySelector('#progress-date').textContent = today.toUpperCase();

async function loadProgress() {
  let quizHistory = readList('studyBuddyQuizHistory');
  let reviewedCount = Number(localStorage.getItem('studyBuddyFlashcardsReviewed')) || 0;
  let cardEvents = readList('studyBuddyFlashcardActivity');
  try {
    const user = await getSignedInUser();
    if (user) {
      const [cloudQuizzes, cloudCards] = await Promise.all([getQuizResults(user, 1000), getFlashcardProgress(user)]);
      if (cloudQuizzes.length) quizHistory = cloudQuizzes.reverse();
      if (cloudCards && Number.isFinite(Number(cloudCards.reviewed))) reviewedCount = Number(cloudCards.reviewed);
    }
  } catch {
    // Local history stays available if the cloud connection is offline.
  }
  const quizEvents = quizHistory.map((entry) => entry.completedAt || entry.date?.toDate?.()).filter(Boolean);
  const events = [...quizEvents, ...cardEvents];
  renderWeeklyActivity(events);
  renderStreak(events);
  renderQuizStats(quizHistory, reviewedCount);
}

loadProgress();
