# Envelope AI - Brand Guidelines

## Brand Identity

**Envelope AI** empowers newsletter creators to leverage ChatGPT as a distribution channel. We transform complex AI technology into a simple, no-code platform that drives audience growth.

### Brand Values
- **Simplicity**: Complex technology, simple experience
- **Empowerment**: Give creators superpowers
- **Intelligence**: AI-driven optimization, not guesswork
- **Growth**: Focus on measurable subscriber growth

---

## Visual Identity

### Logo
The Envelope AI logo combines a classic envelope icon with circuit board patterns, symbolizing the fusion of traditional newsletter communication with AI technology.

- **Primary Logo**: Full color on light backgrounds
- **Icon Only**: Use for favicons, app icons, small spaces
- **Minimum Size**: 120px width for legibility

### Color Palette

**Primary Colors:**
- **Deep Purple** `#6366F1` - Primary brand color, used for CTAs, headers
- **Cyan** `#06B6D4` - Accent color, used for highlights, success states

**Neutral Colors:**
- **Slate 950** `#020617` - Primary text
- **Slate 700** `#334155` - Secondary text
- **Slate 200** `#E2E8F0` - Borders, dividers
- **Slate 50** `#F8FAFC` - Background, cards

**Semantic Colors:**
- **Success Green** `#10B981` - Success states, positive metrics
- **Warning Amber** `#F59E0B` - Warnings, trial expiring
- **Error Red** `#EF4444` - Errors, failed tests
- **Info Blue** `#3B82F6` - Information, tooltips

### Typography

**Headings:**
- Font: **Inter** (Google Fonts)
- Weights: 600 (Semibold), 700 (Bold)
- Usage: Page titles, section headers

**Body Text:**
- Font: **Inter** (Google Fonts)
- Weights: 400 (Regular), 500 (Medium)
- Usage: All body copy, UI elements

**Code/Monospace:**
- Font: **JetBrains Mono** (Google Fonts)
- Weight: 400 (Regular)
- Usage: API keys, code snippets, technical data

### Spacing & Layout

**Spacing Scale (Tailwind):**
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

**Container Widths:**
- Dashboard: max-w-7xl (1280px)
- Forms: max-w-md (448px)
- Content: max-w-3xl (768px)

### UI Components

**Buttons:**
- Primary: Deep Purple background, white text
- Secondary: White background, Deep Purple border and text
- Ghost: Transparent background, Deep Purple text
- Destructive: Error Red background, white text

**Cards:**
- Background: White
- Border: Slate 200
- Shadow: sm (subtle)
- Radius: lg (0.5rem)

**Inputs:**
- Border: Slate 200
- Focus: Deep Purple ring
- Error: Error Red border
- Radius: md (0.375rem)

---

## Voice & Tone

**Voice Characteristics:**
- Clear and direct
- Encouraging but not patronizing
- Technical when necessary, simple by default
- Results-oriented

**Example Copy:**

❌ Don't: "Our revolutionary AI-powered platform leverages cutting-edge machine learning to optimize your newsletter's discoverability through advanced metadata engineering."

✅ Do: "Get more subscribers. We help ChatGPT surface your newsletter at the right time."

---

## Dashboard UI Patterns

### Navigation
- Sidebar navigation (collapsed on mobile)
- Top bar with user profile and notifications
- Breadcrumbs for deep navigation

### Data Visualization
- Use charts for trends (line charts, bar charts)
- Use cards for key metrics (subscribers, test accuracy)
- Use tables for detailed data (test results, prompt library)

### Empty States
- Always show next action ("Add your first use case")
- Include helpful illustration or icon
- Provide clear CTA button

### Loading States
- Skeleton screens for content loading
- Spinners for actions (running tests)
- Progress bars for multi-step processes

---

## File Locations

- Logo (PNG): `/home/ubuntu/envelope-ai-logo.png`
- Logo (SVG): To be created
- Favicon: To be generated from logo
- Social Preview: To be created (1200x630px)

---

## Implementation Notes

**Tailwind Config:**
```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#6366F1',
        dark: '#4F46E5',
        light: '#818CF8'
      },
      accent: {
        DEFAULT: '#06B6D4',
        dark: '#0891B2',
        light: '#22D3EE'
      }
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace']
    }
  }
}
```

**Next.js Font Loading:**
```js
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })
```

