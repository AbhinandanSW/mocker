// Browser-side audio helpers.
//
// MediaRecorder produces compressed audio (webm/opus in Chrome), but
// whisper.cpp's server expects a 16 kHz mono 16-bit WAV file unless it's built
// with ffmpeg. Converting in the browser avoids that extra dependency.

const WHISPER_SAMPLE_RATE = 16_000;

/** Decodes any browser-recorded audio and re-encodes it as 16 kHz mono WAV. */
export async function toWhisperWav(recording: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(await recording.arrayBuffer());
  } finally {
    void audioContext.close();
  }

  // Resample to 16 kHz and mix down to one channel.
  const frameCount = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frameCount, WHISPER_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const resampled = await offline.startRendering();

  return encodeWav(resampled.getChannelData(0), WHISPER_SAMPLE_RATE);
}

/** Wraps float samples (-1..1) in a 16-bit PCM WAV container. */
function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  // RIFF header
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  // "fmt " chunk: PCM, 1 channel
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  // "data" chunk
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([view], { type: 'audio/wav' });
}
