import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // ジゲン カラーパレット(2026-05-30 CEO 大方針転換: ダーク+ゴールド+権威感)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ジゲン ブランドトークン
        jigen: {
          'bg-dark': '#0a0f1e',       // 主背景(濃紺〜黒)
          'bg-panel': '#111827',      // パネル背景(やや明)
          'bg-panel-2': '#1a2236',    // パネル背景(さらに明)
          'border-soft': '#2a3550',   // パネル境界
          gold: '#f5c441',            // メインゴールド(資格学校の権威感)
          'gold-bright': '#ffd95e',   // ハイライト用ゴールド
          'gold-dark': '#b08a1f',     // 影/枠線用ダークゴールド
          warning: '#ef4444',         // 警告(赤)
          'warning-soft': '#7f1d1d',  // 警告背景
          ink: '#f8fafc',             // 主文字(白)
          'ink-soft': '#cbd5e1',      // サブ文字(薄)
          'ink-mute': '#94a3b8',      // 補助文字(さらに薄)
        },
      },
      boxShadow: {
        'gold-glow': '0 0 24px rgba(245, 196, 65, 0.25)',
        'gold-glow-strong': '0 0 40px rgba(245, 196, 65, 0.45)',
        'panel': '0 10px 30px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #ffd95e 0%, #f5c441 50%, #b08a1f 100%)',
        'warning-gradient': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        'panel-gradient': 'linear-gradient(180deg, #111827 0%, #0a0f1e 100%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-jp)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
