/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#213b38',
    tint: '#2d6156',

    // Core surfaces
    background: '#f5f2e9',
    foreground: '#213b38',

    // Cards / elevated surfaces
    card: '#fdfcf9',
    cardForeground: '#213b38',

    // Primary action color (buttons, links, active states)
    primary: '#2d6156',
    primaryForeground: '#f5f2e9',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#f1bd62',
    secondaryForeground: '#213b38',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ebe7dc',
    mutedForeground: '#64817c',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#df8e7b',
    accentForeground: '#213b38',

    // Destructive actions (delete, error states)
    destructive: '#d24b3b',
    destructiveForeground: '#f5f2e9',

    // Borders and input outlines
    border: '#ded8c9',
    input: '#ded8c9',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 14,
};

export default colors;
