const GUIDE_KEY = 'studyBuddyAiSummary';
const SOURCE_KEY = 'studyBuddySummarySource';

export function readStudyGuide() {
  try {
    return JSON.parse(localStorage.getItem(GUIDE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveStudyGuide(guide) {
  if (!guide) return false;
  try {
    localStorage.setItem(GUIDE_KEY, JSON.stringify(guide));
    if (guide.fileName) localStorage.setItem(SOURCE_KEY, guide.fileName);
    return true;
  } catch {
    return false;
  }
}

export function getStudySourceName() {
  try {
    return localStorage.getItem(SOURCE_KEY) || readStudyGuide()?.fileName || '';
  } catch {
    return readStudyGuide()?.fileName || '';
  }
}

export function getStudyContext() {
  const guide = readStudyGuide();
  if (!guide) return '';
  if (typeof guide.extractedText === 'string' && guide.extractedText.trim().length >= 20) {
    return guide.extractedText.trim();
  }
  if (typeof guide.studyText === 'string' && guide.studyText.trim().length >= 20) {
    return guide.studyText.trim();
  }

  const concepts = Array.isArray(guide.keyConcepts)
    ? guide.keyConcepts.map((item) => `${item.name}: ${item.explanation}`).join('\n')
    : '';
  const definitions = Array.isArray(guide.definitions)
    ? guide.definitions.map((item) => `${item.term}: ${item.definition}`).join('\n')
    : '';
  const facts = Array.isArray(guide.facts) ? guide.facts.join('\n') : '';

  return [guide.summary, concepts, definitions, facts].filter(Boolean).join('\n\n');
}

export function hasStudyMaterial() {
  return getStudyContext().length >= 20;
}
