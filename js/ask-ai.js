import { requestStudyBuddyAI } from './ai-api.js';
import { getStudyContext, getStudySourceName, hasStudyMaterial, readStudyGuide } from './study-context.js';

const chatMessages = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const sendButton = document.querySelector('#send-message');
const suggestedQuestions = document.querySelector('#suggested-questions');
const clearChatButton = document.querySelector('#clear-chat');
const materialTitle = document.querySelector('#active-material-name');
const sideMaterialTitle = document.querySelector('#side-material-name');
let isReplying = false;

function getMaterialTitle() {
  const guide = readStudyGuide();
  if (guide?.title) return guide.title;
  const fileName = getStudySourceName();
  if (!fileName) return hasStudyMaterial() ? 'Your study material' : 'No notes uploaded yet';
  const title = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[—–]/g, ':')
    .replace(/\s*:\s*/g, ': ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const currentMaterial = getMaterialTitle();
if (materialTitle) materialTitle.textContent = currentMaterial;
if (sideMaterialTitle) sideMaterialTitle.textContent = currentMaterial;

function currentTime() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function makeMessage(role, text) {
  const isAssistant = role === 'assistant';
  const article = document.createElement('article');
  article.className = `chat-message ${isAssistant ? 'assistant-message' : 'user-message'}`;

  const avatar = document.createElement('span');
  avatar.className = `message-avatar ${isAssistant ? 'assistant-avatar' : 'user-avatar'}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = isAssistant ? '✳' : 'S';

  const content = document.createElement('div');
  content.className = 'message-content';
  const author = document.createElement('div');
  author.className = 'message-author';
  author.textContent = isAssistant ? 'Study Buddy · AI tutor' : 'You';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  bubble.append(paragraph);
  const time = document.createElement('time');
  time.textContent = currentTime();
  content.append(author, bubble, time);
  article.append(avatar, content);
  return { article, paragraph };
}

function addTypingIndicator() {
  const article = document.createElement('article');
  article.className = 'chat-message assistant-message typing-message';
  article.setAttribute('role', 'status');
  article.setAttribute('aria-label', 'Study Buddy is thinking');
  article.innerHTML = '<span class="message-avatar assistant-avatar" aria-hidden="true">✳</span><div class="message-content"><div class="message-author">Study Buddy <span>· Thinking...</span></div><div class="typing-bubble"><i></i><i></i><i></i></div></div>';
  chatMessages.append(article);
  scrollToLatest();
  return article;
}

function scrollToLatest() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setComposerDisabled(disabled) {
  isReplying = disabled;
  chatInput.disabled = disabled;
  sendButton.disabled = disabled;
  if (clearChatButton) clearChatButton.disabled = disabled;
  document.querySelectorAll('[data-prompt]').forEach((button) => {
    button.disabled = disabled;
  });
}

function typeResponse(paragraph, response, done) {
  let characterIndex = 0;
  const typingSpeed = 12;
  const typingTimer = window.setInterval(() => {
    characterIndex = Math.min(characterIndex + 3, response.length);
    paragraph.textContent = response.slice(0, characterIndex);
    scrollToLatest();

    if (characterIndex === response.length) {
      window.clearInterval(typingTimer);
      done();
    }
  }, typingSpeed);
}

function showRetry(message) {
  const retryRow = document.createElement('div');
  retryRow.className = 'chat-retry-row';
  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'chat-retry-button';
  retryButton.textContent = 'Retry';
  retryButton.addEventListener('click', () => {
    retryRow.remove();
    sendMessage(message);
  });
  chatMessages.append(retryRow);
  retryRow.append(retryButton);
}

async function sendMessage(message) {
  const question = message.trim();
  if (!question || isReplying) return;

  const userMessage = makeMessage('user', question);
  chatMessages.append(userMessage.article);
  if (suggestedQuestions) suggestedQuestions.hidden = true;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  setComposerDisabled(true);
  scrollToLatest();

  const typingIndicator = addTypingIndicator();
  let response;
  let failed = false;
  try {
    const result = await requestStudyBuddyAI('ask', {
      data: { question, studyText: getStudyContext() },
    });
    response = result.answer;
    if (!response) throw new Error('The AI returned an empty answer. Please try again.');
  } catch (error) {
    failed = true;
    response = error.message || 'Something went wrong. Please try again.';
  }

  typingIndicator.remove();
  const assistantMessage = makeMessage('assistant', '');
  chatMessages.append(assistantMessage.article);
  typeResponse(assistantMessage.paragraph, response, () => {
    if (failed) showRetry(question);
    setComposerDisabled(false);
    chatInput.focus();
    scrollToLatest();
  });
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) {
    chatInput.focus();
    return;
  }
  sendMessage(question);
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});

clearChatButton.addEventListener('click', () => {
  if (isReplying) return;
  chatMessages.querySelectorAll('.chat-message:not([data-welcome])').forEach((message) => message.remove());
  chatMessages.querySelectorAll('.chat-retry-row').forEach((row) => row.remove());
  if (suggestedQuestions) suggestedQuestions.hidden = false;
  chatMessages.scrollTop = 0;
  chatInput.focus();
});

const welcome = chatMessages.querySelector('.assistant-message');
if (welcome) welcome.setAttribute('data-welcome', 'true');
