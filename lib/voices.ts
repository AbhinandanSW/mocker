// Interviewer personas: a random name + gender + voice per interview, so each
// practice session feels like talking to a different person.
//
// Browsers don't expose a voice's gender, so we guess from the voice name.
// "Natural"/"Online" voices (Edge) and Google voices sound far more human than
// the default robotic ones, so those are preferred.

export type Gender = 'female' | 'male';

export type InterviewerPersona = {
  name: string;
  gender: Gender;
  /** Small per-persona variation so voices don't all sound the same. */
  rate: number;
  pitch: number;
  /** Chosen once the browser's voice list is available, then kept for the session. */
  voiceName?: string;
};

const NAMES: Record<Gender, string[]> = {
  female: ['Priya', 'Ananya', 'Meera', 'Neha', 'Sarah', 'Emily', 'Olivia', 'Aisha'],
  male: ['Rahul', 'Arjun', 'Karan', 'Rohan', 'David', 'Michael', 'James', 'Daniel'],
};

// Checked in this order: "Female" contains "male", so female hints go first.
const FEMALE_VOICE_HINTS =
  /female|aria|jenny|zira|hazel|susan|samantha|karen|moira|tessa|fiona|victoria|neerja|heera|swara|kalpana|sonia|libby|clara|emma|ava|michelle|natasha|catherine|linda|allison|google us english/i;
const MALE_VOICE_HINTS =
  /\bmale\b|david|mark|george|guy|ryan|ravi|prabhat|madhur|hemant|daniel|alex|fred|thomas|christopher|eric|brian|andrew|william|liam|roger|tony/i;

const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const between = (min: number, max: number) => +(min + Math.random() * (max - min)).toFixed(2);

/** Creates a random interviewer. Pass a name to keep an existing session's interviewer. */
export function createPersona(name?: string): InterviewerPersona {
  const gender: Gender = name
    ? NAMES.male.includes(name) ? 'male' : 'female'
    : random<Gender>(['female', 'male']);
  return {
    name: name || random(NAMES[gender]),
    gender,
    rate: between(0.93, 1.03),
    pitch: gender === 'female' ? between(1.0, 1.1) : between(0.9, 1.0),
  };
}

// --- Choosing a voice --------------------------------------------------------

function guessGender(voice: SpeechSynthesisVoice): Gender | undefined {
  if (FEMALE_VOICE_HINTS.test(voice.name)) return 'female';
  if (MALE_VOICE_HINTS.test(voice.name)) return 'male';
  return undefined;
}

/** Higher = more human-sounding. */
function voiceQuality(voice: SpeechSynthesisVoice) {
  if (/natural|neural|online/i.test(voice.name)) return 3;
  if (/google/i.test(voice.name)) return 2;
  return 1;
}

function englishVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'));
}

/** Picks a random voice among the most natural ones matching the persona's gender. */
function pickVoice(gender: Gender) {
  const voices = englishVoices();
  if (!voices.length) return undefined;
  const sameGender = voices.filter(v => guessGender(v) === gender);
  const pool = sameGender.length ? sameGender : voices;
  const best = Math.max(...pool.map(voiceQuality));
  return random(pool.filter(v => voiceQuality(v) === best));
}

/** Returns the persona's voice, choosing (and remembering) one if needed. */
export function resolveVoice(persona: InterviewerPersona) {
  const voices = englishVoices();
  const existing = persona.voiceName && voices.find(v => v.name === persona.voiceName);
  if (existing) return existing;
  const voice = pickVoice(persona.gender);
  if (voice) persona.voiceName = voice.name;
  return voice;
}

/** Runs `callback` once the browser has loaded its voice list (it loads asynchronously). */
export function whenVoicesReady(callback: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.getVoices().length) {
    callback();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.speechSynthesis.removeEventListener('voiceschanged', run);
    callback();
  };
  window.speechSynthesis.addEventListener('voiceschanged', run);
  window.setTimeout(run, 1500); // some browsers never fire the event
}

// --- Remembering the persona per session (so a reload keeps the same interviewer) ---

const storageKey = (sessionId: string) => `interviewer-persona:${sessionId}`;

export function savePersona(sessionId: string, persona: InterviewerPersona) {
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(persona));
  } catch {
    // storage unavailable (private mode etc.) — the persona just won't persist
  }
}

export function loadPersona(sessionId: string): InterviewerPersona | undefined {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    return raw ? (JSON.parse(raw) as InterviewerPersona) : undefined;
  } catch {
    return undefined;
  }
}
