import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth, isFirebaseConfigured } from './firebase.js';
import { saveUserProfile } from './firestore-data.js';

function currentPageName() {
  const fileName = window.location.pathname.split('/').pop();
  return fileName && fileName.endsWith('.html') ? fileName : 'dashboard.html';
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

export function protectAuthenticatedPage() {
  const nextPage = currentPageName();
  const logoutButton = document.querySelector('#logout-button');

  if (!isFirebaseConfigured() || !auth) {
    window.location.replace(`login.html?setup=required&next=${encodeURIComponent(nextPage)}`);
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace(`login.html?next=${encodeURIComponent(nextPage)}`);
      return;
    }

    const displayName = user.displayName || user.email?.split('@')[0] || 'Student';
    setText('#welcome-name', displayName);
    setText('#sidebar-user-name', displayName);
    setText('#sidebar-user-detail', user.email || 'Signed in');
    setText('#profile-user-name', displayName);
    setText('#profile-user-detail', 'Signed in');
    document.body.classList.remove('auth-check');
    saveUserProfile(user).catch(() => {});
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.setAttribute('aria-label', 'Logging out');
      try {
        await signOut(auth);
      } catch {
        logoutButton.disabled = false;
        logoutButton.setAttribute('aria-label', 'Log out');
      }
    });
  }
}

protectAuthenticatedPage();
