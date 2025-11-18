export interface InspirationPrompt {
  text: string;
  category?: string;
}

export const INSPIRATION_PROMPTS: InspirationPrompt[] = [
  { text: 'Build me a Todo App', category: 'web' },
  { text: 'Build me a Blog', category: 'web' },
  { text: 'Build me a Snake Game', category: 'games' },
  { text: 'Build me a Tic Tac Toe', category: 'games' },
  { text: 'Build me a Note Taking App', category: 'productivity' },
  { text: 'Build me a Chat App', category: 'social' },
];

