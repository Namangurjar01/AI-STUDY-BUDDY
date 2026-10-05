import { getSignedInUser } from './firestore-data.js';

function readErrorMessage(result, fallback) {
  return result?.error || result?.data?.error || fallback;
}

export async function requestStudyBuddyAI(endpoint, { data, file } = {}) {
  const user = await getSignedInUser();
  if (!user) {
    throw new Error('Sign in to use the AI study tools.');
  }
  const token = await user.getIdToken();
  const headers = { Authorization: `Bearer ${token}` };
  const options = { method: 'POST', headers };

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    options.body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data || {});
  }

  let response;
  try {
    response = await fetch(`/api/${endpoint.includes('/') ? endpoint : `ai/${endpoint}`}`, options);
  } catch {
    throw new Error('Could not reach the AI backend. Start it with npm start and try again.');
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readErrorMessage(result, 'Something went wrong. Please try again.'));
  }
  return result.data && typeof result.data === 'object' ? { ...result.data } : result;
}
