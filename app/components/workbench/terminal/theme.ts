import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--rax-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--rax-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--rax-elements-terminal-textColor'),
    background: cssVar('--rax-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--rax-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--rax-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--rax-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--rax-elements-terminal-color-black'),
    red: cssVar('--rax-elements-terminal-color-red'),
    green: cssVar('--rax-elements-terminal-color-green'),
    yellow: cssVar('--rax-elements-terminal-color-yellow'),
    blue: cssVar('--rax-elements-terminal-color-blue'),
    magenta: cssVar('--rax-elements-terminal-color-magenta'),
    cyan: cssVar('--rax-elements-terminal-color-cyan'),
    white: cssVar('--rax-elements-terminal-color-white'),
    brightBlack: cssVar('--rax-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--rax-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--rax-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--rax-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--rax-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--rax-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--rax-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--rax-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
