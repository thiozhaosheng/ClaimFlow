/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        subtle: "var(--bg-subtle)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
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

        // shadcn-compatible aliases
        background: "var(--bg-app)",
        foreground: "var(--text-primary)",
        card: {
          DEFAULT: "var(--bg-card)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--bg-card)",
          foreground: "var(--text-primary)",
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--text-secondary)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "#ffffff",
        },
        border: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
        input: "var(--border-default)",
        ring: "var(--accent-ring)",
        chart: {
          1: "var(--accent)",
          2: "var(--info)",
          3: "var(--success)",
          4: "var(--warning)",
          5: "var(--danger)",
        },
      },
      borderRadius: {
        "ds-sm": "var(--radius-sm)",
        "ds-md": "var(--radius-md)",
        "ds-lg": "var(--radius-lg)",
        "ds-xl": "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
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
          '"Geist"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: [
          '"Geist Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.035em",
        tighter: "-0.025em",
        tight: "-0.015em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
