export enum Speaker {
  USER = 'user',
  GEMINI_A = 'gemini-a',
  GEMINI_B = 'gemini-b',
}

export interface Message {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}
