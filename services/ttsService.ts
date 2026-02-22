
export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onEnd?: () => void;
  onStart?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private isPlaying: boolean = false;
  private options: TTSOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    }
  }

  public setOptions(options: Partial<TTSOptions>) {
    this.options = { ...this.options, ...options };
  }

  public speak(text: string, options?: Partial<TTSOptions>) {
    if (!this.synth) return;

    this.cancel();

    const sentences = this.tokenize(text);
    this.queue = sentences;
    this.isPlaying = true;
    
    const mergedOptions = { ...this.options, ...options };
    this.processQueue(mergedOptions);
  }

  private tokenize(text: string): string[] {
    // Split on . ! ? followed by space or end of string
    // This is a simple tokenizer as requested
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  private processQueue(options: TTSOptions, cumulativeOffset: number = 0) {
    if (!this.synth || this.queue.length === 0) {
      this.isPlaying = false;
      options.onEnd?.();
      return;
    }

    const text = this.queue.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;
    if (options.voice) utterance.voice = options.voice;

    utterance.onboundary = (event) => {
      // Create a proxy event or just call with modified index
      const modifiedEvent = {
        ...event,
        charIndex: event.charIndex + cumulativeOffset
      };
      options.onBoundary?.(modifiedEvent as any);
    };

    utterance.onend = () => {
      // Add text length + 1 for the space/split character
      this.processQueue(options, cumulativeOffset + text.length + 1);
    };

    utterance.onerror = (event) => {
      console.error('TTS Error:', event);
      options.onError?.(event);
      this.isPlaying = false;
    };

    utterance.onstart = () => {
      options.onStart?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth) this.synth.pause();
  }

  public resume() {
    if (this.synth) this.synth.resume();
  }

  public cancel() {
    if (this.synth) {
      this.synth.cancel();
      this.queue = [];
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ttsService = new TTSService();
