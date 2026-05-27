/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        card: "var(--bg-card)",
        subtle: "var(--bg-subtle)",
        muted: "var(--bg-muted)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          ring: "var(--accent-ring)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
          text: "var(--warning-text)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
          text: "var(--danger-text)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
          text: "var(--info-text)",
        },
      },
      borderRadius: {
        "ds-sm": "var(--radius-sm)",
        "ds-md": "var(--radius-md)",
        "ds-lg": "var(--radius-lg)",
        "ds-xl": "var(--radius-xl)",
      },
      boxShadow: {
        "ds-xs": "var(--shadow-xs)",
        "ds-sm": "var(--shadow-sm)",
        "ds-md": "var(--shadow-md)",
        "ds-lg": "var(--shadow-lg)",
        "ds-xl": "var(--shadow-xl)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Inter"',
          '"Segoe UI"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
