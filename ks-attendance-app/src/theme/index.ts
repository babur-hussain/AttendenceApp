/**
 * Theme System Exports
 * 
 * Centralized exports for the design system.
 */

import { tokens } from './tokens';

export { tokens };
export const colors = tokens.colors;
export const spacing = tokens.spacing;
export const typography = tokens.typography;
export type { Tokens, ColorKey, SpacingKey, FontSizeKey } from './tokens';

export { lightTheme } from './light';
export type { LightTheme } from './light';

export { darkTheme } from './dark';
export type { DarkTheme } from './dark';

export {
  ThemeProvider,
  useTheme,
  useThemeColors,
  useSpacing,
  useTypography,
  useShadows,
  makeStyles,
} from './useTheme';
