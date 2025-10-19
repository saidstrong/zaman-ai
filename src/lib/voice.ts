// Simple voice command handling via Web Speech API

export interface VoiceCommand {
  action: 'topup' | 'transfer' | 'invest' | 'assistant' | 'unknown';
  amount?: number;
  target?: string;
  instrument?: string;
  message?: string;
}

export interface SRResultItem { 
  transcript: string; 
  confidence: number 
}

export interface SRResult { 
  isFinal: boolean; 
  0: SRResultItem 
}

export interface SRResultList { 
  length: number; 
  item(i: number): SRResult; 
  [index: number]: SRResult 
}

export interface SRCallbackEvent { 
  results: SRResultList 
}

export interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart?: () => void;
  onresult: (ev: SRCallbackEvent) => void;
  onerror: (ev: { error: string }) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

export type SRConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SRConstructor;
    SpeechRecognition?: SRConstructor;
  }
}

export function createRecognizer(): ISpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export class VoiceController {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback?: (command: VoiceCommand) => void;
  private onErrorCallback?: (error: string) => void;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private ruVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.recognition = createRecognizer();
    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ru-RU';
    }
    
    // Load voices for TTS
    this.loadVoices();
  }

  private loadVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoicesList = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.ruVoice = this.voices.find(voice => 
        voice.lang.startsWith('ru') || voice.lang.startsWith('RU')
      ) || null;
    };

    // Load voices immediately if available
    loadVoicesList();

    // Listen for voices to load
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoicesList;
    }
  }

  parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase();
    
    // Extract amount
    const amountMatch = lowerText.match(/(\d+)\s*(тысяч|тыс|миллион|млн|миллионов)/);
    let amount: number | undefined;
    
    if (amountMatch) {
      const num = parseInt(amountMatch[1]);
      const unit = amountMatch[2];
      if (unit.includes('тысяч') || unit.includes('тыс')) {
        amount = num * 1000;
      } else if (unit.includes('миллион')) {
        amount = num * 1000000;
      }
    }

    // Assistant commands
    if (lowerText.includes('ассистент') || lowerText.includes('чат') || lowerText.includes('помощь')) {
      return { action: 'assistant', message: text };
    }

    // Product search commands
    if (lowerText.includes('подобрать') || lowerText.includes('найти')) {
      return { action: 'assistant', message: text };
    }
    
    // Parse commands
    if (lowerText.includes('пополнить') || lowerText.includes('пополн')) {
      return { action: 'topup', amount };
    }
    
    if (lowerText.includes('перевести') || lowerText.includes('перевод')) {
      let target = 'savings';
      if (lowerText.includes('карт')) target = 'card';
      if (lowerText.includes('сбережен')) target = 'savings';
      if (lowerText.includes('буфер')) target = 'buffer';
      
      return { action: 'transfer', amount, target };
    }
    
    if (lowerText.includes('инвест') || lowerText.includes('инвестировать')) {
      let instrument = 'sukuk';
      if (lowerText.includes('акци')) instrument = 'halal-stocks';
      if (lowerText.includes('золот')) instrument = 'gold';
      if (lowerText.includes('крипт')) instrument = 'crypto';
      
      return { action: 'invest', amount, instrument };
    }

    return { action: 'unknown' };
  }

  startListening(onResult: (command: VoiceCommand) => void, onError?: (error: string) => void): void {
    if (!this.recognition) {
      onError?.('Голосовое управление недоступно');
      return;
    }

    if (this.isListening) return;

    this.isListening = true;
    
    this.recognition.onstart = () => {
      // console.log('Voice recognition started');
    };
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const command = this.parseCommand(transcript);
      onResult(command);
      this.stopListening();
    };

    this.recognition.onerror = (event) => {
      onError?.(`Ошибка распознавания: ${event.error}`);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();

    // Auto-stop after 8 seconds of silence
    setTimeout(() => {
      if (this.isListening) {
        this.stopListening();
      }
    }, 8000);
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  // TTS Functions
  speak(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    this.stopSpeak();

    // Split text into chunks of max 220 characters
    const chunks = this.splitText(text, 220);
    
    if (chunks.length === 0) return;

    // Speak the first chunk
    this.speakChunk(chunks, 0);
  }

  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
          currentChunk = trimmed;
        } else {
          // Single sentence too long, split by words
          const words = trimmed.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          
          if (wordChunk) currentChunk = wordChunk;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  private speakChunk(chunks: string[], index: number): void {
    if (index >= chunks.length || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    
    // Set voice
    if (this.ruVoice) {
      utterance.voice = this.ruVoice;
    }
    
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      // Speak next chunk
      setTimeout(() => {
        this.speakChunk(chunks, index + 1);
      }, 100);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeak(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }

  // Enhanced STT Functions
  startSTT(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError?.('Распознавание речи недоступно в этом браузере');
      return;
    }

    if (this.isListening) return;

    this.isListening = true;
    
    this.recognition.onstart = () => {
      console.log('STT started');
    };
    
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript = transcript + finalTranscript;
        } else {
          interimTranscript = transcript + interimTranscript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('STT error:', event.error);
      
      if (event.error === 'not-allowed') {
        onError?.('Доступ к микрофону запрещен');
        this.stopSTT();
      } else {
        // Auto-restart for other errors
        setTimeout(() => {
          if (this.isListening) {
            this.recognition?.start();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('STT ended');
    };

    this.recognition.start();
  }

  stopSTT(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isListeningSTT(): boolean {
    return this.isListening;
  }
}
