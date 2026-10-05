import { getStudyContext, readStudyGuide } from './study-context.js';
import { requestStudyBuddyAI } from './ai-api.js';

const loadingPanel = document.querySelector('#summary-loading');
const summaryContent = document.querySelector('#summary-content');
const sourceName = document.querySelector('#summary-source-name');
const summaryTitle = document.querySelector('#summary-title');
const downloadButton = document.querySelector('#download-summary');
const aiGuide = readStudyGuide();

function getSelectedSource() {
  try {
    return localStorage.getItem('studyBuddySummarySource') || aiGuide?.fileName || '';
  } catch {
    return aiGuide?.fileName || '';
  }
}

function titleFromFileName(fileName) {
  const title = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[—–]/g, ':')
    .replace(/\s*:\s*/g, ': ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const fileName = getSelectedSource();
sourceName.textContent = fileName || 'No material selected';
summaryTitle.textContent = aiGuide?.title || (fileName ? titleFromFileName(fileName) : 'Your study guide');

function appendTextRow(container, className, title, body, index) {
  const row = document.createElement('article');
  row.className = className;
  const number = document.createElement('span');
  number.className = 'concept-number';
  number.textContent = String(index + 1).padStart(2, '0');
  const copy = document.createElement('div');
  const heading = document.createElement('h3');
  heading.textContent = title;
  const description = document.createElement('p');
  description.textContent = body;
  copy.append(heading, description);
  row.append(number, copy);
  container.append(row);
}

function renderGeneratedGuide(guide) {
  if (!guide || typeof guide.summary !== 'string') return;

  document.querySelector('.summary-prose').textContent = guide.summary;
  sourceName.textContent = guide.fileName || fileName;
  if (guide.pageCount) document.querySelector('#summary-page-count').textContent = `${guide.pageCount} pages`;

  const bannerText = document.querySelector('.summary-demo-banner small');
  bannerText.textContent = 'Generated from the text extracted from your PDF.';
  document.querySelector('.summary-footer-note').textContent = 'AI-generated study content. Review important details against your original material.';

  if (Array.isArray(guide.keyConcepts) && guide.keyConcepts.length) {
    const list = document.querySelector('.concept-list');
    list.replaceChildren();
    guide.keyConcepts.forEach((concept, index) => appendTextRow(list, 'concept-item', concept.name, concept.explanation, index));
  }

  if (Array.isArray(guide.definitions) && guide.definitions.length) {
    const list = document.querySelector('.definition-list');
    list.replaceChildren();
    guide.definitions.forEach((definition) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = definition.term;
      const meaning = document.createElement('dd');
      meaning.textContent = definition.definition;
      row.append(term, meaning);
      list.append(row);
    });
  }

  if (Array.isArray(guide.facts) && guide.facts.length) {
    const list = document.querySelector('.fact-list');
    list.replaceChildren();
    guide.facts.forEach((fact) => {
      const item = document.createElement('li');
      item.textContent = fact;
      list.append(item);
    });
  }

  if (Array.isArray(guide.quickRevision) && guide.quickRevision.length) {
    const section = document.querySelector('.revision-section');
    section.querySelectorAll('.revision-prompt').forEach((prompt) => prompt.remove());
    guide.quickRevision.forEach((item, index) => {
      const prompt = document.createElement('div');
      prompt.className = 'revision-prompt';
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const question = document.createElement('p');
      question.textContent = item.question;
      const details = document.createElement('details');
      const reveal = document.createElement('summary');
      reveal.textContent = 'Reveal answer';
      const answer = document.createElement('p');
      answer.textContent = item.answer;
      details.append(reveal, answer);
      prompt.append(number, question, details);
      section.append(prompt);
    });
  }
}

if (aiGuide && typeof aiGuide.summary === 'string' && aiGuide.summary.trim()) {
  renderGeneratedGuide(aiGuide);
  window.setTimeout(() => {
    loadingPanel.hidden = true;
    summaryContent.hidden = false;
    downloadButton.disabled = false;
  }, 250);
} else {
  loadingPanel.hidden = true;
  document.querySelector('#summary-empty').hidden = false;
  document.querySelector('#summary-source-notice').hidden = true;
}

downloadButton.addEventListener('click', () => {
  const sections = [...summaryContent.querySelectorAll('.summary-section')];
  const lines = [
    `AI Study Buddy Summary: ${summaryTitle.textContent}`,
    `Source: ${fileName}`,
    'Generated from your uploaded study material.',
    '',
    ...sections.flatMap((section) => [section.innerText.trim(), '']),
  ];
  const summaryFile = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(summaryFile);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `${titleFromFileName(fileName).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-summary.txt`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
});

async function generatePractice(endpoint, button, storageKey, destination) {
  const studyText = getStudyContext();
  const status = document.querySelector('#summary-ai-action-status');
  if (!studyText) {
    status.textContent = 'Analyze a study PDF before generating practice from it.';
    return;
  }

  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  status.textContent = endpoint === 'quiz' ? 'Generating your quiz...' : 'Generating your flashcards...';
  try {
    const result = await requestStudyBuddyAI(endpoint, {
      data: endpoint === 'quiz'
        ? { studyText, questionCount: 10, difficulty: 'Medium' }
        : { studyText, cardCount: 10 },
    });
    if (endpoint === 'quiz' && !Array.isArray(result.questions)) {
      throw new Error('The AI did not return a valid quiz. Please try again.');
    }
    if (endpoint === 'flashcards' && !Array.isArray(result.flashcards)) {
      throw new Error('The AI did not return valid flashcards. Please try again.');
    }
    localStorage.setItem(storageKey, JSON.stringify({ ...result, title: summaryTitle.textContent }));
    window.location.href = destination;
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

document.querySelector('#summary-generate-quiz').addEventListener('click', (event) => {
  generatePractice('quiz', event.currentTarget, 'studyBuddyAiQuiz', 'quiz.html');
});

document.querySelector('#summary-generate-flashcards').addEventListener('click', (event) => {
  generatePractice('flashcards', event.currentTarget, 'studyBuddyAiFlashcards', 'flashcards.html');
});
