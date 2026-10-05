import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase.js';

const loginTab = document.querySelector('#login-tab');
const signupTab = document.querySelector('#signup-tab');
const authForm = document.querySelector('#auth-form');
const emailInput = document.querySelector('#auth-email');
const passwordInput = document.querySelector('#auth-password');
const passwordConfirm = document.querySelector('#auth-password-confirm');
const confirmWrap = document.querySelector('#password-confirm-wrap');
const heading = document.querySelector('#auth-heading');
const description = document.querySelector('#auth-description');
const submitButton = document.querySelector('#auth-submit');
const message = document.querySelector('#auth-message');
const setupNotice = document.querySelector('#firebase-setup-notice');
const forgotButton = document.querySelector('#forgot-password');
let currentMode = new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login';

function getDashboardUrl() {
  const requestedPage = new URLSearchParams(window.location.search).get('next');
  const allowedPages = new Set([
    'dashboard.html',
    'upload.html',
    'summary.html',
    'ask-ai.html',
    'quiz.html',
    'flashcards.html',
    'progress.html',
  ]);
  return allowedPages.has(requestedPage) ? requestedPage : 'dashboard.html';
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('is-error', isError);
  message.classList.toggle('is-success', !isError);
}

function updateMode(mode) {
  currentMode = mode;
  const isSignup = mode === 'signup';
  loginTab.classList.toggle('active', !isSignup);
  signupTab.classList.toggle('active', isSignup);
  loginTab.setAttribute('aria-selected', String(!isSignup));
  signupTab.setAttribute('aria-selected', String(isSignup));
  heading.textContent = isSignup ? 'Create your account' : 'Welcome back';
  description.textContent = isSignup
    ? 'Create a free account to start building better study habits.'
    : 'Sign in with your email and password to continue.';
  submitButton.innerHTML = `${isSignup ? 'Create account' : 'Log in'} <span aria-hidden="true">→</span>`;
  confirmWrap.hidden = !isSignup;
  passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
  passwordConfirm.required = isSignup;
  passwordConfirm.disabled = !isSignup;
  message.textContent = '';
  message.classList.remove('is-error', 'is-success');
  const query = new URLSearchParams(window.location.search);
  if (isSignup) query.set('mode', 'signup');
  else query.delete('mode');
  const queryText = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${queryText ? `?${queryText}` : ''}`);
}

function readableAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'There is already an account with this email. Try logging in instead.',
    'auth/invalid-email': 'Enter a valid email address and try again.',
    'auth/invalid-credential': 'That email and password do not match. Check them and try again.',
    'auth/user-not-found': 'No account was found with that email. Try signing up instead.',
    'auth/wrong-password': 'That email and password do not match. Check them and try again.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
    'auth/network-request-failed': 'Could not connect to Firebase. Check your internet connection and try again.',
    'auth/operation-not-allowed': 'Email/Password sign-in is not enabled in your Firebase project yet.',
    'auth/invalid-api-key': 'The Firebase config looks invalid. Check js/firebase-config.js.',
    'auth/unauthorized-domain': 'This site is not allowed to sign in to Firebase. Add localhost under Authentication → Settings → Authorized domains, then refresh.',
    'auth/configuration-not-found': 'Firebase Authentication is not configured for this project. Enable Email/Password under Authentication → Sign-in method.',
  };
  return messages[error.code] || `Firebase sign-in failed${error.code ? ` (${error.code})` : ''}. Check the provider, authorized domain, and Firebase web config.`;
}

loginTab.addEventListener('click', () => updateMode('login'));
signupTab.addEventListener('click', () => updateMode('signup'));

if (!isFirebaseConfigured()) {
  setupNotice.hidden = false;
  submitButton.disabled = true;
  forgotButton.disabled = true;
  showMessage('Add your Firebase web configuration before testing authentication.', true);
} else {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace(getDashboardUrl());
  });
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isFirebaseConfigured() || !auth) {
    showMessage('Add your Firebase configuration to js/firebase-config.js first.', true);
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showMessage('Enter your email and password to continue.', true);
    return;
  }
  if (currentMode === 'signup' && password !== passwordConfirm.value) {
    showMessage('Those passwords do not match. Check them and try again.', true);
    passwordConfirm.focus();
    return;
  }

  submitButton.disabled = true;
  showMessage(currentMode === 'signup' ? 'Creating your account...' : 'Signing you in...');

  try {
    if (currentMode === 'signup') {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    showMessage('Signed in successfully. Opening your dashboard...');
    window.location.replace(getDashboardUrl());
  } catch (error) {
    showMessage(readableAuthError(error), true);
    submitButton.disabled = false;
  }
});

forgotButton.addEventListener('click', async () => {
  if (!isFirebaseConfigured() || !auth) {
    showMessage('Add your Firebase configuration before resetting a password.', true);
    return;
  }

  const email = emailInput.value.trim();
  if (!email) {
    showMessage('Enter your email address first, then choose Forgot password.', true);
    emailInput.focus();
    return;
  }

  forgotButton.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage('Password reset email sent. Check your inbox.');
  } catch (error) {
    showMessage(readableAuthError(error), true);
  } finally {
    forgotButton.disabled = false;
  }
});

updateMode(currentMode);
