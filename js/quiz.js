import { getSignedInUser, saveQuizResult } from './firestore-data.js';

import { requestStudyBuddyAI } from './ai-api.js';
import { getStudyContext } from './study-context.js';

const questionBank = [
  { id: 1, difficulty: 'Easy', topic: 'CELL BASICS', prompt: 'What is the basic structural and functional unit of all living things?', options: ['A tissue', 'A cell', 'An organ', 'A molecule'], answer: 1, explanation: 'Cells are the smallest units that can carry out the processes associated with life. Tissues and organs are made of many cells.' },
  { id: 2, difficulty: 'Easy', topic: 'CELL STRUCTURE', prompt: 'Which structure forms the boundary around a cell and controls what enters or leaves?', options: ['The plasma membrane', 'The nucleolus', 'A ribosome', 'A chromosome'], answer: 0, explanation: 'The plasma membrane surrounds the cell and is selectively permeable, helping regulate the movement of substances in and out.' },
  { id: 3, difficulty: 'Easy', topic: 'CELL STRUCTURE', prompt: 'Which cell structure assembles proteins?', options: ['The vacuole', 'The cell wall', 'The ribosome', 'The chloroplast'], answer: 2, explanation: 'Ribosomes join amino acids together to build proteins, following instructions encoded by messenger RNA.' },
  { id: 4, difficulty: 'Easy', topic: 'PLANT CELLS', prompt: 'Which organelle captures light energy for photosynthesis in plant cells?', options: ['The mitochondrion', 'The lysosome', 'The Golgi apparatus', 'The chloroplast'], answer: 3, explanation: 'Chloroplasts contain chlorophyll and convert light energy into chemical energy during photosynthesis.' },
  { id: 5, difficulty: 'Medium', topic: 'CELL STRUCTURE', prompt: 'Which statement best describes the nucleus in a typical eukaryotic cell?', options: ['It stores most of the cell’s DNA', 'It makes all the cell’s ATP', 'It controls every movement across the membrane', 'It digests worn-out organelles'], answer: 0, explanation: 'The nucleus houses most eukaryotic DNA and helps regulate gene expression. Mitochondria also contain a small amount of DNA.' },
  { id: 6, difficulty: 'Medium', topic: 'CELL ENERGY', prompt: 'What is a major role of mitochondria in many eukaryotic cells?', options: ['Storing hereditary information for the whole organism', 'Releasing usable energy from food during cellular respiration', 'Building the cell’s outer wall', 'Capturing light for photosynthesis'], answer: 1, explanation: 'Mitochondria are a major site of cellular respiration, which transfers energy from food molecules into ATP that cells can use.' },
  { id: 7, difficulty: 'Medium', topic: 'CELL TYPES', prompt: 'Which feature distinguishes prokaryotic cells from eukaryotic cells?', options: ['They do not contain DNA', 'They cannot have a cell membrane', 'They lack a membrane-bound nucleus', 'They are always larger'], answer: 2, explanation: 'Prokaryotes have DNA but do not enclose it in a membrane-bound nucleus. They still have a plasma membrane and other cell structures.' },
  { id: 8, difficulty: 'Hard', topic: 'PROTEIN TRANSPORT', prompt: 'A cell is producing a protein that will be released outside the cell. Which route best describes its path?', options: ['Ribosome → rough ER → Golgi apparatus → vesicle', 'Nucleus → chloroplast → lysosome → membrane', 'Smooth ER → nucleolus → mitochondrion → vesicle', 'Ribosome → vacuole → nucleus → membrane'], answer: 0, explanation: 'Proteins for secretion are made by ribosomes on the rough ER, processed and sorted through the Golgi apparatus, then carried in vesicles to the membrane.' },
  { id: 9, difficulty: 'Hard', topic: 'MEMBRANE TRANSPORT', prompt: 'Why can small nonpolar molecules cross a phospholipid bilayer more easily than charged ions?', options: ['The membrane has no proteins', 'The bilayer’s hydrophobic interior discourages charged particles', 'Nonpolar molecules are actively pumped by ribosomes', 'Charged ions are too small to interact with water'], answer: 1, explanation: 'The inside of the phospholipid bilayer is hydrophobic. Small nonpolar molecules can diffuse through it, while charged ions usually need membrane transport proteins.' },
  { id: 10, difficulty: 'Hard', topic: 'PLANT CELLS', prompt: 'A plant cell is placed in a solution with a lower water concentration than its cytoplasm. What is most likely to happen first?', options: ['Water enters the cell by osmosis', 'Water leaves the cell by osmosis', 'The chloroplasts become the cell membrane', 'The nucleus releases water into the solution'], answer: 1, explanation: 'Water moves by osmosis toward the side with a higher solute concentration. In this case, water tends to leave the cell, and the membrane may pull away from the cell wall.' },
];

const difficultySelect = document.querySelector('#difficulty-select');
const questionCount = document.querySelector('#question-count');
const questionContent = document.querySelector('#quiz-content');
const progressLabel = document.querySelector('#quiz-progress-label');
const progressValue = document.querySelector('#quiz-progress-value');
const progressBar = document.querySelector('#quiz-progress-bar');
const progressTrack = document.querySelector('.quiz-progress-track-full');
const questionTopic = document.querySelector('#question-topic');
const questionDifficulty = document.querySelector('#question-difficulty');
const quizWorkspace = document.querySelector('#quiz-workspace');
const quizResult = document.querySelector('#quiz-result');
const aiQuizButton = document.querySelector('#generate-ai-quiz');
const aiQuizStatus = document.querySelector('#quiz-ai-status');
let activeQuestions = [...questionBank];
let currentQuestion = 0;
let answers = [];
let checkedAnswers = [];

function shuffleQuestions(questions) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function updateProgress() {
  const completedCount = checkedAnswers.filter(Boolean).length;
  const percent = Math.round((completedCount / activeQuestions.length) * 100);
  progressLabel.textContent = `QUESTION ${currentQuestion + 1} OF ${activeQuestions.length}`;
  progressValue.textContent = `${percent}% complete`;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute('aria-valuemax', String(activeQuestions.length));
  progressTrack.setAttribute('aria-valuenow', String(completedCount));
}

function startQuiz(questions) {
  activeQuestions = questions;
  currentQuestion = 0;
  answers = Array(activeQuestions.length).fill(null);
  checkedAnswers = Array(activeQuestions.length).fill(false);
  questionCount.textContent = String(activeQuestions.length);
  quizWorkspace.hidden = false;
  quizResult.hidden = true;
  renderQuestion();
}

function renderQuestion() {
  const question = activeQuestions[currentQuestion];
  questionTopic.textContent = question.topic;
  questionDifficulty.textContent = question.difficulty.toUpperCase();
  questionDifficulty.dataset.level = question.difficulty.toLowerCase();
  updateProgress();
  questionContent.replaceChildren();

  const prompt = document.createElement('h2');
  prompt.className = 'full-question-text';
  prompt.textContent = question.prompt;
  const answerList = document.createElement('div');
  answerList.className = 'full-answer-list';
  answerList.setAttribute('role', 'group');
  answerList.setAttribute('aria-label', 'Answer choices');
  const feedback = document.createElement('p');
  feedback.className = 'quiz-answer-feedback';
  feedback.setAttribute('aria-live', 'polite');

  question.options.forEach((option, optionIndex) => {
    const answerButton = document.createElement('button');
    answerButton.className = 'full-answer-option';
    answerButton.type = 'button';
    answerButton.setAttribute('aria-pressed', String(answers[currentQuestion] === optionIndex));
    const letter = document.createElement('span');
    letter.className = 'full-answer-letter';
    letter.textContent = String.fromCharCode(65 + optionIndex);
    const optionText = document.createElement('span');
    optionText.className = 'full-answer-text';
    optionText.textContent = option;
    const stateIcon = document.createElement('span');
    stateIcon.className = 'answer-state-icon';
    stateIcon.setAttribute('aria-hidden', 'true');
    answerButton.append(letter, optionText, stateIcon);

    if (answers[currentQuestion] === optionIndex) answerButton.classList.add('is-selected');
    if (checkedAnswers[currentQuestion]) {
      answerButton.disabled = true;
      if (optionIndex === question.answer) {
        answerButton.classList.add('is-correct');
        stateIcon.textContent = '✓';
      } else if (optionIndex === answers[currentQuestion]) {
        answerButton.classList.add('is-wrong');
        stateIcon.textContent = '×';
      }
    }

    answerButton.addEventListener('click', () => {
      if (checkedAnswers[currentQuestion]) return;
      answers[currentQuestion] = optionIndex;
      answerList.querySelectorAll('.full-answer-option').forEach((button) => {
        button.classList.remove('is-selected');
        button.setAttribute('aria-pressed', 'false');
      });
      answerButton.classList.add('is-selected');
      answerButton.setAttribute('aria-pressed', 'true');
      feedback.textContent = '';
      checkButton.disabled = false;
    });
    answerList.append(answerButton);
  });

  if (checkedAnswers[currentQuestion]) {
    const correct = answers[currentQuestion] === question.answer;
    feedback.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
    feedback.textContent = correct
      ? `Correct. ${question.explanation}`
      : `Not quite. ${question.explanation}`;
  }

  const navigation = document.createElement('div');
  navigation.className = 'full-quiz-navigation';
  const previousButton = document.createElement('button');
  previousButton.className = 'quiz-previous-button';
  previousButton.type = 'button';
  previousButton.textContent = '← Previous';
  previousButton.disabled = currentQuestion === 0;
  previousButton.addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion -= 1;
      renderQuestion();
    }
  });

  const navigationActions = document.createElement('div');
  navigationActions.className = 'quiz-navigation-actions';
  const checkButton = document.createElement('button');
  checkButton.className = 'quiz-check-button';
  checkButton.type = 'button';
  checkButton.textContent = checkedAnswers[currentQuestion] ? 'Answer checked' : 'Check answer';
  checkButton.disabled = answers[currentQuestion] === null || checkedAnswers[currentQuestion];
  checkButton.addEventListener('click', () => {
    if (answers[currentQuestion] === null) {
      feedback.textContent = 'Choose an answer before checking.';
      return;
    }
    checkedAnswers[currentQuestion] = true;
    renderQuestion();
  });

  const nextButton = document.createElement('button');
  nextButton.className = 'quiz-next-button';
  nextButton.type = 'button';
  nextButton.textContent = currentQuestion === activeQuestions.length - 1 ? 'See results' : 'Next question';
  nextButton.disabled = !checkedAnswers[currentQuestion];
  nextButton.addEventListener('click', () => {
    if (!checkedAnswers[currentQuestion]) return;
    if (currentQuestion === activeQuestions.length - 1) {
      showResults();
      return;
    }
    currentQuestion += 1;
    renderQuestion();
  });

  navigationActions.append(checkButton, nextButton);
  navigation.append(previousButton, navigationActions);
  questionContent.append(prompt, answerList, feedback, navigation);
}

function makeScoreStat(label, value, className) {
  const stat = document.createElement('div');
  stat.className = `quiz-score-stat ${className}`;
  const number = document.createElement('strong');
  number.textContent = String(value);
  const description = document.createElement('span');
  description.textContent = label;
  stat.append(number, description);
  return stat;
}

function showResults() {
  const correctAnswers = activeQuestions.filter((question, index) => answers[index] === question.answer);
  const wrongAnswers = activeQuestions
    .map((question, index) => ({ question, selected: answers[index] }))
    .filter((answer) => answer.selected !== answer.question.answer);
  const percentage = Math.round((correctAnswers.length / activeQuestions.length) * 100);

  try {
    localStorage.setItem('studyBuddyLatestQuiz', String(percentage));
    const savedHistory = JSON.parse(localStorage.getItem('studyBuddyQuizHistory') || '[]');
    const history = Array.isArray(savedHistory) ? savedHistory : [];
    history.push({ score: percentage, completedAt: new Date().toISOString() });
    localStorage.setItem('studyBuddyQuizHistory', JSON.stringify(history.slice(-50)));
  } catch {
    // Keep showing the result if browser storage is unavailable.
  }

  getSignedInUser()
    .then((user) => user && saveQuizResult(user, {
      score: correctAnswers.length,
      totalQuestions: activeQuestions.length,
      percentage,
    }))
    .catch(() => {});

  quizWorkspace.hidden = true;
  quizResult.hidden = false;
  quizResult.replaceChildren();
  const resultHeader = document.createElement('div');
  resultHeader.className = 'quiz-result-header';
  const resultIcon = document.createElement('span');
  resultIcon.className = 'quiz-result-icon';
  resultIcon.textContent = percentage >= 70 ? '✦' : '↻';
  const resultHeading = document.createElement('div');
  const resultKicker = document.createElement('p');
  resultKicker.className = 'quiz-result-kicker';
  resultKicker.textContent = 'QUIZ COMPLETE';
  const resultTitle = document.createElement('h2');
  resultTitle.textContent = percentage >= 70 ? 'Nice work. Keep that momentum.' : 'Good practice. Keep building on it.';
  resultHeading.append(resultKicker, resultTitle);
  resultHeader.append(resultIcon, resultHeading);

  const scoreOverview = document.createElement('div');
  scoreOverview.className = 'quiz-score-overview';
  const scoreMain = document.createElement('div');
  scoreMain.className = 'quiz-score-main';
  const percentageLabel = document.createElement('strong');
  percentageLabel.textContent = `${percentage}%`;
  const fraction = document.createElement('span');
  fraction.textContent = `${correctAnswers.length} of ${activeQuestions.length} correct`;
  scoreMain.append(percentageLabel, fraction);
  scoreOverview.append(scoreMain, makeScoreStat('Correct answers', correctAnswers.length, 'correct-stat'), makeScoreStat('Wrong answers', wrongAnswers.length, 'wrong-stat'));

  const resultActions = document.createElement('div');
  resultActions.className = 'quiz-result-actions';
  const tryAgainButton = document.createElement('button');
  tryAgainButton.className = 'quiz-next-button';
  tryAgainButton.type = 'button';
  tryAgainButton.textContent = 'Try Again';
  tryAgainButton.addEventListener('click', () => startQuiz([...activeQuestions]));
  const newQuizButton = document.createElement('button');
  newQuizButton.className = 'quiz-secondary-button';
  newQuizButton.type = 'button';
  newQuizButton.textContent = 'Generate New Quiz';
  newQuizButton.addEventListener('click', () => startQuiz(shuffleQuestions(activeQuestions)));
  const dashboardLink = document.createElement('a');
  dashboardLink.className = 'quiz-dashboard-button';
  dashboardLink.href = 'dashboard.html';
  dashboardLink.textContent = 'Back to Dashboard';
  resultActions.append(tryAgainButton, newQuizButton, dashboardLink);

  const review = document.createElement('section');
  review.className = 'quiz-answer-review';
  const reviewHeading = document.createElement('div');
  reviewHeading.className = 'quiz-review-heading';
  const reviewTitle = document.createElement('h3');
  reviewTitle.textContent = 'Answer review';
  const reviewSubtitle = document.createElement('p');
  reviewSubtitle.textContent = wrongAnswers.length
    ? 'Review the questions you missed and the reasoning behind each answer.'
    : 'You got every question right. Take a look back at the key ideas.';
  reviewHeading.append(reviewTitle, reviewSubtitle);
  review.append(reviewHeading);

  if (!wrongAnswers.length) {
    const allCorrect = document.createElement('p');
    allCorrect.className = 'all-correct-note';
    allCorrect.textContent = 'No missed questions this round. Great recall!';
    review.append(allCorrect);
  } else {
    wrongAnswers.forEach(({ question, selected }) => {
      const item = document.createElement('article');
      item.className = 'wrong-answer-review';
      const prompt = document.createElement('h4');
      prompt.textContent = question.prompt;
      const yourAnswer = document.createElement('p');
      yourAnswer.className = 'your-answer';
      yourAnswer.textContent = `Your answer: ${question.options[selected]}`;
      const correctAnswer = document.createElement('p');
      correctAnswer.className = 'correct-answer';
      correctAnswer.textContent = `Correct answer: ${question.options[question.answer]}`;
      const explanation = document.createElement('p');
      explanation.className = 'wrong-answer-explanation';
      explanation.textContent = question.explanation;
      item.append(prompt, yourAnswer, correctAnswer, explanation);
      review.append(item);
    });
  }

  quizResult.append(resultHeader, scoreOverview, resultActions, review);
  quizResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

difficultySelect.addEventListener('change', () => {
  const selectedDifficulty = difficultySelect.value;
  const filteredQuestions = selectedDifficulty === 'all'
    ? [...questionBank]
    : questionBank.filter((question) => question.difficulty === selectedDifficulty);
  startQuiz(filteredQuestions);
});

aiQuizButton.addEventListener('click', async () => {
  const studyText = getStudyContext();
  if (!studyText) {
    aiQuizStatus.textContent = 'Upload and analyze a study PDF first to generate a quiz from your material.';
    return;
  }

  aiQuizButton.disabled = true;
  aiQuizButton.textContent = 'Generating...';
  aiQuizStatus.textContent = 'Creating questions from your study guide...';
  try {
    const response = await requestStudyBuddyAI('quiz', {
      data: {
        studyText,
        questionCount: 10,
        difficulty: difficultySelect.value === 'all' ? 'Medium' : difficultySelect.value,
      },
    });
    const generatedQuestions = response.questions.map((question, index) => ({
      id: `ai-${Date.now()}-${index}`,
      difficulty: question.difficulty || (difficultySelect.value === 'all' ? 'Medium' : difficultySelect.value),
      topic: question.topic || 'YOUR STUDY MATERIAL',
      prompt: question.prompt,
      options: question.options,
      answer: Number(question.answer),
      explanation: question.explanation || 'Review this idea in your study guide.',
    }));
    if (generatedQuestions.some((question) => question.options.length !== 4 || question.answer < 0 || question.answer > 3)) {
      throw new Error('The generated quiz did not contain four valid options for every question. Try again.');
    }
    startQuiz(generatedQuestions);
    aiQuizStatus.textContent = 'Quiz generated from your study material.';
  } catch (error) {
    aiQuizStatus.textContent = error.message;
  } finally {
    aiQuizButton.disabled = false;
    aiQuizButton.innerHTML = 'Generate from my notes <span aria-hidden="true">✳</span>';
  }
});

function readPendingAiQuiz() {
  try {
    const pending = JSON.parse(localStorage.getItem('studyBuddyAiQuiz') || 'null');
    if (!Array.isArray(pending?.questions) || !pending.questions.length) return null;
    const questions = pending.questions.map((question, index) => ({
      id: `ai-summary-${index}`,
      difficulty: question.difficulty || 'Medium',
      topic: question.topic || 'YOUR STUDY MATERIAL',
      prompt: question.prompt,
      options: question.options,
      answer: Number(question.answer),
      explanation: question.explanation || 'Review this idea in your study guide.',
    }));
    if (questions.some((question) => !question.prompt || question.options?.length !== 4 || question.answer < 0 || question.answer > 3)) return null;
    document.querySelector('.quiz-page-header h1').textContent = `${pending.title || 'Study Material'} Quiz`;
    document.querySelector('.quiz-topic-label strong').textContent = pending.title || 'Study Material';
    document.querySelector('.quiz-topic-label small').textContent = 'AI-generated from your study guide';
    localStorage.removeItem('studyBuddyAiQuiz');
    return questions;
  } catch {
    return null;
  }
}

startQuiz(readPendingAiQuiz() || [...questionBank]);
