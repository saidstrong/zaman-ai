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

  constructor() {
    this.recognition = createRecognizer();
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ru-RU';
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
}
