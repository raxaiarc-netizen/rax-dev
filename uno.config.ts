import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'rax';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#1f2121',
    950: '#191a1a',
  },
  accent: {
    50: '#EBF5FF',
    100: '#D6EAFF',
    200: '#ADD6FF',
    300: '#7DB8FF',
    400: '#5C9FFF',
    500: '#3D83FF',
    600: '#2E6FE8',
    700: '#2456CC',
    800: '#1A3FA3',
    900: '#133180',
    950: '#0A1C4D',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  safelist: [
    ...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-rax:${x}`),
    'i-ph:gear',
    'i-ph:gear-six',
    'i-ph:credit-card',
    'i-ph:question',
    'i-ph:gift',
    'i-ph:sign-out',
    'i-ph:camera',
    'i-ph:arrow-up-right',
    'i-ph:caret-down',
    'i-ph:user',
    'i-ph:user-circle',
    'i-ph:clock',
    'i-ph:plus-circle',
    'i-ph:x',
    'i-ph:check-square',
    'i-ph:magnifying-glass',
    'i-ph:bug',
    'i-ph:download',
    // Inspiration category icons
    'i-ph:globe-duotone',
    'i-ph:game-controller-duotone',
    'i-ph:lightning-duotone',
    'i-ph:users-duotone',
    'i-ph:wrench-duotone',
    'i-ph:palette-duotone',
    // Inspiration app icons
    'i-ph:check-square-duotone',
    'i-ph:book-open-duotone',
    'i-ph:shopping-cart-duotone',
    'i-ph:squares-four-duotone',
    'i-ph:desktop-duotone',
    'i-ph:briefcase-duotone',
    'i-ph:grid-four-duotone',
    'i-ph:circle-duotone',
    'i-ph:stack-duotone',
    'i-ph:brain-duotone',
    'i-ph:keyboard-duotone',
    'i-ph:note-duotone',
    'i-ph:calendar-duotone',
    'i-ph:list-checks-duotone',
    'i-ph:timer-duotone',
    'i-ph:wallet-duotone',
    'i-ph:target-duotone',
    'i-ph:chat-circle-duotone',
    'i-ph:rss-duotone',
    'i-ph:user-duotone',
    'i-ph:image-duotone',
    'i-ph:calendar-check-duotone',
    'i-ph:calculator-duotone',
    'i-ph:cloud-sun-duotone',
    'i-ph:arrows-counter-clockwise-duotone',
    'i-ph:key-duotone',
    'i-ph:qr-code-duotone',
    'i-ph:paint-brush-duotone',
    'i-ph:music-note-duotone',
    'i-ph:video-duotone',
    'i-ph:sparkle-duotone',
    'i-ph:cube-duotone',
  ],
  shortcuts: {
    'rax-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 rax-ease-cubic-bezier',
    kdb: 'bg-rax-elements-code-background text-rax-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      rax: {
        elements: {
          borderColor: 'var(--rax-elements-borderColor)',
          borderColorActive: 'var(--rax-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--rax-elements-bg-depth-1)',
              2: 'var(--rax-elements-bg-depth-2)',
              3: 'var(--rax-elements-bg-depth-3)',
              4: 'var(--rax-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--rax-elements-textPrimary)',
          textSecondary: 'var(--rax-elements-textSecondary)',
          textTertiary: 'var(--rax-elements-textTertiary)',
          code: {
            background: 'var(--rax-elements-code-background)',
            text: 'var(--rax-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--rax-elements-button-primary-background)',
              backgroundHover: 'var(--rax-elements-button-primary-backgroundHover)',
              text: 'var(--rax-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--rax-elements-button-secondary-background)',
              backgroundHover: 'var(--rax-elements-button-secondary-backgroundHover)',
              text: 'var(--rax-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--rax-elements-button-danger-background)',
              backgroundHover: 'var(--rax-elements-button-danger-backgroundHover)',
              text: 'var(--rax-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--rax-elements-item-contentDefault)',
            contentActive: 'var(--rax-elements-item-contentActive)',
            contentAccent: 'var(--rax-elements-item-contentAccent)',
            contentDanger: 'var(--rax-elements-item-contentDanger)',
            backgroundDefault: 'var(--rax-elements-item-backgroundDefault)',
            backgroundActive: 'var(--rax-elements-item-backgroundActive)',
            backgroundAccent: 'var(--rax-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--rax-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--rax-elements-actions-background)',
            code: {
              background: 'var(--rax-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--rax-elements-artifacts-background)',
            backgroundHover: 'var(--rax-elements-artifacts-backgroundHover)',
            borderColor: 'var(--rax-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--rax-elements-artifacts-inlineCode-background)',
              text: 'var(--rax-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--rax-elements-messages-background)',
            linkColor: 'var(--rax-elements-messages-linkColor)',
            code: {
              background: 'var(--rax-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--rax-elements-messages-inlineCode-background)',
              text: 'var(--rax-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--rax-elements-icon-success)',
            error: 'var(--rax-elements-icon-error)',
            primary: 'var(--rax-elements-icon-primary)',
            secondary: 'var(--rax-elements-icon-secondary)',
            tertiary: 'var(--rax-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--rax-elements-preview-addressBar-background)',
              backgroundHover: 'var(--rax-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--rax-elements-preview-addressBar-backgroundActive)',
              text: 'var(--rax-elements-preview-addressBar-text)',
              textActive: 'var(--rax-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--rax-elements-terminals-background)',
            buttonBackground: 'var(--rax-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--rax-elements-dividerColor)',
          loader: {
            background: 'var(--rax-elements-loader-background)',
            progress: 'var(--rax-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--rax-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--rax-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--rax-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--rax-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--rax-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--rax-elements-cta-background)',
            text: 'var(--rax-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
        ph: () => import('@iconify-json/ph/icons.json').then((i) => i.default as any),
      },
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      unit: 'em',
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
