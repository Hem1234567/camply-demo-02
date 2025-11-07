export class VoiceRecognition {
  private recognition: any;
  private isListening: boolean = false;
  
  constructor(
    private onResult: (transcript: string) => void,
    private onEnd?: () => void
  ) {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.onResult(finalTranscript.trim());
      } else if (interimTranscript) {
        this.onResult(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        this.stop();
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd?.();
    };
  }

  start() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser');
      return;
    }

    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isActive() {
    return this.isListening;
  }
}
