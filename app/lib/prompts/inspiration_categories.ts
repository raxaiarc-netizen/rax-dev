export interface InspirationApp {
  name: string;
  icon: string;
}

export interface InspirationCategory {
  id: string;
  label: string;
  icon: string;
  apps: InspirationApp[];
}

export const INSPIRATION_CATEGORIES: InspirationCategory[] = [
  {
    id: 'web',
    label: 'Web Apps',
    icon: 'i-ph:globe-duotone',
    apps: [
      { name: 'Todo App', icon: 'i-ph:check-square-duotone' },
      { name: 'Blog', icon: 'i-ph:book-open-duotone' },
      { name: 'E-commerce Store', icon: 'i-ph:shopping-cart-duotone' },
      { name: 'Dashboard', icon: 'i-ph:squares-four-duotone' },
      { name: 'Landing Page', icon: 'i-ph:desktop-duotone' },
      { name: 'Portfolio', icon: 'i-ph:briefcase-duotone' },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    icon: 'i-ph:game-controller-duotone',
    apps: [
      { name: 'Snake Game', icon: 'i-ph:game-controller-duotone' },
      { name: 'Tic Tac Toe', icon: 'i-ph:grid-four-duotone' },
      { name: 'Pong', icon: 'i-ph:circle-duotone' },
      { name: 'Tetris', icon: 'i-ph:stack-duotone' },
      { name: 'Memory Game', icon: 'i-ph:brain-duotone' },
      { name: 'Wordle', icon: 'i-ph:keyboard-duotone' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: 'i-ph:lightning-duotone',
    apps: [
      { name: 'Note Taking App', icon: 'i-ph:note-duotone' },
      { name: 'Calendar', icon: 'i-ph:calendar-duotone' },
      { name: 'Task Manager', icon: 'i-ph:list-checks-duotone' },
      { name: 'Pomodoro Timer', icon: 'i-ph:timer-duotone' },
      { name: 'Expense Tracker', icon: 'i-ph:wallet-duotone' },
      { name: 'Habit Tracker', icon: 'i-ph:target-duotone' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: 'i-ph:users-duotone',
    apps: [
      { name: 'Chat App', icon: 'i-ph:chat-circle-duotone' },
      { name: 'Social Feed', icon: 'i-ph:rss-duotone' },
      { name: 'Profile Page', icon: 'i-ph:user-duotone' },
      { name: 'Photo Gallery', icon: 'i-ph:image-duotone' },
      { name: 'Event Platform', icon: 'i-ph:calendar-check-duotone' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'i-ph:wrench-duotone',
    apps: [
      { name: 'Calculator', icon: 'i-ph:calculator-duotone' },
      { name: 'Weather App', icon: 'i-ph:cloud-sun-duotone' },
      { name: 'Unit Converter', icon: 'i-ph:arrows-counter-clockwise-duotone' },
      { name: 'Password Generator', icon: 'i-ph:key-duotone' },
      { name: 'QR Code Generator', icon: 'i-ph:qr-code-duotone' },
      { name: 'Color Picker', icon: 'i-ph:palette-duotone' },
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    icon: 'i-ph:palette-duotone',
    apps: [
      { name: 'Drawing App', icon: 'i-ph:paint-brush-duotone' },
      { name: 'Music Player', icon: 'i-ph:music-note-duotone' },
      { name: 'Video Player', icon: 'i-ph:video-duotone' },
      { name: 'Animation Showcase', icon: 'i-ph:sparkle-duotone' },
      { name: '3D Viewer', icon: 'i-ph:cube-duotone' },
    ],
  },
];

