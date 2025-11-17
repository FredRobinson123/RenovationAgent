import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "card-border": "hsl(var(--card-border))",
        widget: {
          DEFAULT: "hsl(var(--widget))",
          foreground: "hsl(var(--widget-foreground))",
        },
        "widget-border": "hsl(var(--widget-border))",
        "bubble-agent": "hsl(var(--bubble-agent))",
        "bubble-agent-foreground": "hsl(var(--bubble-agent-foreground))",
        "bubble-agent-border": "hsl(var(--bubble-agent-border))",
        "bubble-user": "hsl(var(--bubble-user))",
        "bubble-user-foreground": "hsl(var(--bubble-user-foreground))",
        "bubble-user-border": "hsl(var(--bubble-user-border))",
        "soft-linen": "hsl(var(--color-soft-linen))",
        clay: "hsl(var(--color-clay))",
        "charcoal-taupe": "hsl(var(--color-charcoal-taupe))",
        "faded-clay": "hsl(var(--color-faded-clay))",
        "primary-border": "hsl(var(--primary-border))",
        "secondary-border": "hsl(var(--secondary-border))",
        "muted-border": "hsl(var(--muted-border))",
        "accent-border": "hsl(var(--accent-border))",
        "destructive-border": "hsl(var(--destructive-border))",
        "sidebar": {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
        },
        "sidebar-border": "hsl(var(--sidebar-border))",
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary))",
          foreground: "hsl(var(--sidebar-primary-foreground))",
        },
        "sidebar-primary-border": "hsl(var(--sidebar-primary-border))",
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent))",
          foreground: "hsl(var(--sidebar-accent-foreground))",
        },
        "sidebar-accent-border": "hsl(var(--sidebar-accent-border))",
        "sidebar-ring": "hsl(var(--sidebar-ring))",
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
        playful: ["'DM Sans'", "var(--font-sans)", "sans-serif"],
        ren: ["var(--font-ren)", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;

