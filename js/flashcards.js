import { getSignedInUser, getFlashcardProgress, saveFlashcardProgress } from './firestore-data.js';
import { requestStudyBuddyAI } from './ai-api.js';
import { getStudyContext, readStudyGuide } from './study-context.js';

const cards = [
  { id: 'array', question: 'What is an array?', answer: 'A collection of elements stored in indexed positions, usually in a contiguous block of memory.' },
  { id: 'linked-list', question: 'How does a linked list connect its elements?', answer: 'Each node stores data and a reference to the next node. A doubly linked list also references the previous node.' },
  { id: 'stack', question: 'What rule does a stack follow?', answer: 'Last in, first out (LIFO). The most recently added item is the first one removed.' },
  { id: 'queue', question: 'What rule does a queue follow?', answer: 'First in, first out (FIFO). The earliest added item is the first one removed.' },
  { id: 'hash-table', question: 'What is a hash table used for?', answer: 'It maps keys to values using a hash function, allowing average-case lookup, insertion, and deletion in O(1) time.' },
  { id: 'binary-search-tree', question: 'What ordering property does a binary search tree use?', answer: 'Values in the left subtree are smaller than the node; values in the right subtree are larger, according to the tree’s comparison rule.' },
  { id: 'heap', question: 'What does a max-heap guarantee about its root?', answer: 'The root contains the largest value in the heap. A min-heap instead keeps the smallest value at its root.' },
  { id: 'graph', question: 'What are the two basic parts of a graph?', answer: 'Vertices (or nodes) and edges that connect pairs of vertices. Graphs can be directed or undirected.' },
  { id: 'bfs', question: 'Which data structure does breadth-first search use to explore a graph?', answer: 'A queue. It visits nearby vertices first, exploring the graph one distance layer at a time.' },
  { id: 'big-o', question: 'What does Big O notation describe?', answer: 'How an algorithm’s resource use, commonly time or memory, grows as the input size increases.' },
];

function loadPendingAiDeck() {
  try {
    const pending = JSON.parse(localStorage.getItem('studyBuddyAiFlashcards') || 'null');
    if (!Array.isArray(pending?.flashcards) || !pending.flashcards.length) return;
    if (pending.flashcards.some((card) => !card.question || !card.answer)) return;
    cards.splice(0, cards.length, ...pending.flashcards.map((card, index) => ({
      id: `ai-summary-${index}`,
      question: card.question,
      answer: card.answer,
    })));
    const title = pending.title || 'Your study material';
    document.querySelector('#flashcards-topic-title').textContent = title;
    document.querySelector('#flashcards-topic-count').textContent = `AI-generated · ${cards.length} cards`;
    document.querySelectorAll('.study-card-topic').forEach((element) => {
      element.textContent = title.toUpperCase();
    });
    localStorage.removeItem('studyBuddyAiFlashcards');
  } catch {
    localStorage.removeItem('studyBuddyAiFlashcards');
  }
}

loadPendingAiDeck();

const cardButton = document.querySelector('#study-flashcard');
const cardInner = document.querySelector('#flashcard-inner');
const questionText = document.querySelector('#flashcard-question');
const answerText = document.querySelector('#flashcard-answer');
const cardCount = document.querySelector('#card-count');
const progressLabel = document.querySelector('#flashcard-progress-label');
const progressValue = document.querySelector('#flashcard-progress-value');
const progressBar = document.querySelector('#flashcards-progress-bar');
const progressTrack = document.querySelector('.flashcards-progress-track');
const knownCount = document.querySelector('#known-count');
const revisionCount = document.querySelector('#revision-count');
const ratedCount = document.querySelector('#rated-count');
const ratedProgressBar = document.querySelector('#rated-progress-bar');
const knownButton = document.querySelector('#mark-known');
const revisionButton = document.querySelector('#mark-need-revision');
const ratingFeedback = document.querySelector('#flashcard-rating-feedback');
const aiFlashcardsButton = document.querySelector('#generate-ai-flashcards');
const aiFlashcardsStatus = document.querySelector('#flashcards-ai-status');
let deck = [...cards];
let currentCard = 0;
let isFlipped = false;
let ratings = readRatings();
let signedInUser = null;

function readRatings() {
  try {
    const savedRatings = JSON.parse(localStorage.getItem('studyBuddyFlashcardRatings') || '{}');
    return savedRatings && typeof savedRatings === 'object' ? savedRatings : {};
  } catch {
    return {};
  }
}

function saveRatings() {
  try {
    localStorage.setItem('studyBuddyFlashcardRatings', JSON.stringify(ratings));
    return true;
  } catch {
    ratingFeedback.textContent = 'Could not save progress in this browser.';
    return false;
  }
}

function updateRatingProgress() {
  const knownTotal = cards.filter((card) => ratings[card.id] === 'known').length;
  const revisionTotal = cards.filter((card) => ratings[card.id] === 'revision').length;
  const ratedTotal = knownTotal + revisionTotal;
  const percent = Math.round((ratedTotal / cards.length) * 100);

  knownCount.textContent = String(knownTotal);
  revisionCount.textContent = String(revisionTotal);
  ratedCount.textContent = `${ratedTotal} / ${cards.length}`;
  ratedProgressBar.style.width = `${percent}%`;
}

function syncCloudProgress() {
  if (!signedInUser) return;
  const known = cards.filter((card) => ratings[card.id] === 'known').length;
  const needRevision = cards.filter((card) => ratings[card.id] === 'revision').length;
  let reviewed = 0;
  try {
    reviewed = Number(localStorage.getItem('studyBuddyFlashcardsReviewed') || 0);
  } catch {
    reviewed = 0;
  }
  saveFlashcardProgress(signedInUser, { known, needRevision, reviewed, ratings }).catch(() => {});
}

async function loadCloudProgress() {
  const user = await getSignedInUser();
  if (!user) return;
  signedInUser = user;
  try {
    const savedProgress = await getFlashcardProgress(user);
    if (savedProgress && savedProgress.ratings && typeof savedProgress.ratings === 'object') {
      ratings = savedProgress.ratings;
      try {
        localStorage.setItem('studyBuddyFlashcardRatings', JSON.stringify(ratings));
        if (Number.isFinite(Number(savedProgress.reviewed))) {
          localStorage.setItem('studyBuddyFlashcardsReviewed', String(Number(savedProgress.reviewed)));
        }
      } catch {
        // Ratings remain available for this session without local storage.
      }
      updateRatingButtons();
      updateRatingProgress();
    }
  } catch {
    // Keep the locally saved ratings if Firestore is unavailable.
  }
}

function updateDeckProgress() {
  const percent = Math.round(((currentCard + 1) / deck.length) * 100);
  progressLabel.textContent = `CARD ${currentCard + 1} OF ${deck.length}`;
  progressValue.textContent = `${percent}% through deck`;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute('aria-valuemax', String(deck.length));
  progressTrack.setAttribute('aria-valuenow', String(currentCard + 1));
  cardCount.textContent = `${currentCard + 1} / ${deck.length}`;
}

function updateRatingButtons() {
  const rating = ratings[deck[currentCard].id];
  knownButton.classList.toggle('is-active', rating === 'known');
  revisionButton.classList.toggle('is-active', rating === 'revision');
  knownButton.setAttribute('aria-pressed', String(rating === 'known'));
  revisionButton.setAttribute('aria-pressed', String(rating === 'revision'));
}

function renderCard() {
  const card = deck[currentCard];
  questionText.textContent = card.question;
  answerText.textContent = card.answer;
  cardButton.classList.toggle('is-flipped', isFlipped);
  cardButton.setAttribute('aria-pressed', String(isFlipped));
  cardButton.setAttribute('aria-label', isFlipped ? 'Show question' : 'Show answer');
  document.querySelector('#previous-card').disabled = currentCard === 0;
  document.querySelector('#next-card').disabled = currentCard === deck.length - 1;
  updateDeckProgress();
  updateRatingButtons();
}

function markCard(rating) {
  const cardId = deck[currentCard].id;
  if (ratings[cardId] === rating) {
    delete ratings[cardId];
    ratingFeedback.textContent = 'Card rating cleared.';
  } else {
    ratings[cardId] = rating;
    ratingFeedback.textContent = rating === 'known' ? 'Marked as known.' : 'Added to need revision.';
  }
  saveRatings();
  updateRatingButtons();
  updateRatingProgress();
  syncCloudProgress();
}

function shuffleDeck() {
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  currentCard = 0;
  isFlipped = false;
  ratingFeedback.textContent = 'Deck shuffled.';
  renderCard();
}

cardButton.addEventListener('click', () => {
  isFlipped = !isFlipped;
  if (isFlipped) {
    try {
      const reviewed = Number(localStorage.getItem('studyBuddyFlashcardsReviewed') || 0);
      localStorage.setItem('studyBuddyFlashcardsReviewed', String(reviewed + 1));
      syncCloudProgress();
    } catch {
      // The card can still flip if browser storage is unavailable.
    }
  }
  renderCard();
});

document.querySelector('#previous-card').addEventListener('click', () => {
  if (currentCard === 0) return;
  currentCard -= 1;
  isFlipped = false;
  ratingFeedback.textContent = '';
  renderCard();
});

document.querySelector('#next-card').addEventListener('click', () => {
  if (currentCard === deck.length - 1) return;
  currentCard += 1;
  isFlipped = false;
  ratingFeedback.textContent = '';
  renderCard();
});

document.querySelector('#shuffle-cards').addEventListener('click', shuffleDeck);
knownButton.addEventListener('click', () => markCard('known'));
revisionButton.addEventListener('click', () => markCard('revision'));
aiFlashcardsButton.addEventListener('click', async () => {
  const studyText = getStudyContext();
  if (!studyText) {
    aiFlashcardsStatus.textContent = 'Upload and analyze a study PDF first to create flashcards from your material.';
    return;
  }

  aiFlashcardsButton.disabled = true;
  aiFlashcardsButton.textContent = 'Generating...';
  aiFlashcardsStatus.textContent = 'Creating flashcards from your study guide...';
  try {
    const response = await requestStudyBuddyAI('flashcards', { data: { studyText, cardCount: 10 } });
    if (!Array.isArray(response.flashcards) || response.flashcards.some((card) => !card.question || !card.answer)) {
      throw new Error('The generated flashcards were incomplete. Try again.');
    }

    cards.splice(0, cards.length, ...response.flashcards.map((card, index) => ({
      id: `ai-${Date.now()}-${index}`,
      question: card.question,
      answer: card.answer,
    })));
    deck = [...cards];
    ratings = {};
    currentCard = 0;
    isFlipped = false;
    updateRatingProgress();
    renderCard();
    const title = readStudyGuide()?.title || 'Your study material';
    document.querySelector('#flashcards-topic-title').textContent = title;
    document.querySelector('#flashcards-topic-count').textContent = `AI-generated · ${cards.length} cards`;
    document.querySelectorAll('.study-card-topic').forEach((element) => {
      element.textContent = title.toUpperCase();
    });
    syncCloudProgress();
    aiFlashcardsStatus.textContent = `${cards.length} flashcards generated from your study guide.`;
  } catch (error) {
    aiFlashcardsStatus.textContent = error.message;
  } finally {
    aiFlashcardsButton.disabled = false;
    aiFlashcardsButton.innerHTML = 'Generate from my notes <span aria-hidden="true">✳</span>';
  }
});
document.querySelector('#reset-card-ratings').addEventListener('click', () => {
  ratings = {};
  saveRatings();
  ratingFeedback.textContent = 'All card ratings cleared.';
  updateRatingButtons();
  updateRatingProgress();
  syncCloudProgress();
});

updateRatingProgress();
renderCard();
loadCloudProgress();
