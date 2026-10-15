# Local Interviewer

A local-first, voice-enabled mock interview app built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Ollama, and SQLite. No Python backend and no paid LLM API.

## Features

- Resume (PDF/TXT) and job-description context
- Interview modes: Technical, DSA & Coding, System Design, Behavioral, Resume Deep Dive, Full Mock
- Adaptive follow-up questions from a local Ollama model
- Browser voice capture and spoken questions (Web Speech APIs)
- End-of-session rubric, per-answer feedback, ideal answers, and study plan
- SQLite session persistence and history panel
- Local runtime status check

## Requirements

- Node.js 20.11+ recommended
- npm
- Ollama installed and running
- Enough memory for the model you choose. `qwen2.5:3b` is the default; a quantized 3B model is a practical starting point for modest machines but may be slow on 4 GB RAM.

## Setup

### 1. Install Ollama and download a model

Install from <https://ollama.com/download>.

In a terminal, run:

```bash
ollama pull qwen2.5:3b
ollama list
```

Ensure Ollama is running at `http://127.0.0.1:11434`. The app defaults to model `qwen2.5:3b`.

### 2. Install app dependencies

From this folder:

```bash
npm install
```

Copy `.env.example` to `.env.local` if you want to configure the model or database path:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
DATABASE_PATH=./local-data/interviews.sqlite
WHISPER_BASE_URL=http://127.0.0.1:8080
```

### 3. (Recommended) Accurate voice transcription with Whisper

Without this step, spoken answers use the browser's speech recognition, which
cuts out during pauses, struggles with accents and technical terms, and sends
audio to an online service. With Whisper, the app records your whole answer
and transcribes it on your machine when you click **Stop recording** (or
**Submit**). The browser recognition is then only used as a live preview.

1. Download a Windows build of whisper.cpp from
   <https://github.com/ggml-org/whisper.cpp/releases> (e.g. `whisper-bin-x64.zip`)
   and unzip it.
2. Download a model from <https://huggingface.co/ggerganov/whisper.cpp/tree/main>:
   - `ggml-base.en.bin` (~150 MB): fast, good accuracy, the right starting point
   - `ggml-small.en.bin` (~470 MB): more accurate, roughly 3× slower
3. Start the server from the unzipped folder (keep it running alongside the app):

   ```bash
   whisper-server.exe -m ggml-base.en.bin --host 127.0.0.1 --port 8080
   ```

4. Reload the app. The **Local runtime** card should show
   *Speech-to-text: Whisper (local)*.

The browser converts recordings to 16 kHz WAV itself, so ffmpeg is not needed.
If Whisper stops or fails, the app falls back to the browser transcript and
tells you so.

### 4. Run locally

```bash
npm run dev
```

Open <http://127.0.0.1:3000>.

The dev server binds to loopback (`127.0.0.1`), so it is intended for use on the same computer. For a production build:

```bash
npm run build
npm start
```

## Voice and privacy notes

- **LLM inference:** interview prompts and scoring are sent to Ollama on your own computer, not to a hosted AI API.
- **Speech output:** spoken interviewer questions use the browser's `speechSynthesis` API. Available voices and whether voice processing is local depend on your operating system and browser.
- **Speech input:** with Whisper running (setup step 3), answers are recorded and transcribed locally. The live preview while you speak still uses the browser's Web Speech `SpeechRecognition` API, which in Chrome/Edge may send audio to a vendor service. Without Whisper, that browser API is the only transcription and is **not guaranteed to be offline**. You can always type instead.
- For strict offline voice output, use a local TTS engine such as Piper. It is intentionally not bundled because binary installation differs by operating system.
- Resume text, transcripts, and reports are stored in `local-data/interviews.sqlite` on the computer. The folder is ignored by Git.
- Do not expose this development server or Ollama port to the public internet. The app has no authentication because it is designed for a single local user.

## Model configuration

Set `OLLAMA_MODEL` in `.env.local` to another installed Ollama model. For example, if you pull a different model:

```bash
ollama pull qwen2.5:7b
```

then set `OLLAMA_MODEL=qwen2.5:7b`. Larger models generally need more memory. If the model fails to answer structured JSON consistently, try a different instruction-tuned model or a smaller context.

## Current limitations

- The scorecard is LLM-generated feedback, not a validated hiring prediction. Verify factual technical feedback.
- DSA mode currently conducts spoken/text conceptual coding interviews; it does not yet execute submitted code in a sandbox.
- PDF parsing supports selectable text PDFs, not scanned/image-only PDFs.
- Voice recognition support depends on the browser.
- The included UI components follow shadcn/ui conventions and Tailwind styling; the app does not require the full shadcn CLI or remote UI dependency at runtime.

## Troubleshooting

**Cannot connect to Ollama**

```bash
ollama serve
ollama list
```

If `ollama serve` says another instance is already running, that is usually fine. Verify `http://127.0.0.1:11434/api/tags` loads locally.

**Model missing**

```bash
ollama pull qwen2.5:3b
```

**SQLite native module error**

Ensure you use a supported Node.js version, then run `npm rebuild better-sqlite3` or remove `node_modules` and reinstall dependencies.

**Microphone not available**

Use a recent Chrome/Edge browser, allow microphone access, or type your answers. Speech recognition may require an internet connection depending on the browser.
