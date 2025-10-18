// Simple voice command handling via Web Speech API

export interface VoiceCommand {
  action: 'topup' | 'transfer' | 'invest' | 'unknown';
  amount?: number;
  target?: string;
  instrument?: string;
}

export class VoiceController {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
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
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const command = this.parseCommand(transcript);
      onResult(command);
      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      onError?.(`Ошибка распознавания: ${event.error}`);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }
}
