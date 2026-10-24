# WAREgaurd Design System & User Flow

## 🎯 User Flow

```
Landing Page (/) 
    ↓
    [Get Started Button]
    ↓
Dashboard (/dashboard)
    ↓
    [Start Session / Upload Video]
    ↓
Sessions (/sessions)
    ↓
    [View Details / Generate Challan / Watch Recording]
    ↓
Analytics (/stats)
    ↓
    [Export Reports / View Insights]
```

## 🎨 Design Philosophy

### Core Principles
1. **Sleek & Modern**: Clean interfaces with subtle animations
2. **Eye-Catching**: Gradient accents and glow effects
3. **Smooth Interactions**: Framer Motion animations throughout
4. **Consistent**: Unified color palette and spacing
5. **Responsive**: Mobile-first approach

### Color Palette

**Primary Colors:**
- Sky Blue: `#38bdf8` (rgb(56, 189, 248))
- Purple: `#a855f7` (rgb(168, 85, 247))
- Blue: `#3b82f6` (rgb(59, 130, 246))

**Accent Colors:**
- Emerald: `#10b981` (rgb(16, 185, 129))
- Pink: `#ec4899` (rgb(236, 72, 153))
- Indigo: `#6366f1` (rgb(99, 102, 241))

**Backgrounds:**
- Primary: `#02040a` (gray-950)
- Secondary: `#0f1117` (gray-900)
- Tertiary: `#1a1d29` (gray-800)

**Text:**
- Primary: `#ffffff` (white)
- Secondary: `#9ca3af` (gray-400)
- Tertiary: `#6b7280` (gray-500)

### Typography

**Font Weights:**
- Regular: 400
- Semibold: 600
- Bold: 700
- Black: 900

**Sizes:**
- Hero: `text-6xl` to `text-8xl` (60px-96px)
- Heading: `text-4xl` to `text-5xl` (36px-48px)
- Subheading: `text-2xl` to `text-3xl` (24px-30px)
- Body: `text-base` to `text-lg` (16px-18px)
- Small: `text-sm` to `text-xs` (12px-14px)

## 🎭 Animation System

### Framer Motion Variants

**Page Transitions:**
```javascript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: 'easeOut' }}
```

**Hover Effects:**
```javascript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

**Stagger Children:**
```javascript
transition={{ delay: idx * 0.1 }}
```

### CSS Transitions
- Duration: `300ms` to `500ms`
- Easing: `ease-out`, `ease-in-out`
- Properties: `all`, `transform`, `opacity`, `colors`

## 🧩 Component Library

### Navigation Components

**LandingNav**
- Fixed position with scroll-based backdrop blur
- Smooth scroll to sections
- Mobile menu with slide animation
- Gradient CTA button

**Header**
- Sticky header with backdrop blur
- Active tab indicator with layout animation
- Live session badge with pulse effect
- Gradient logo with glow

### UI Elements

**Buttons:**
1. Primary CTA: Gradient background with hover effect
2. Secondary: Border with hover fill
3. Icon buttons: Rounded with icon + text

**Cards:**
1. Feature cards: Hover scale + glow effect
2. Stat cards: Gradient icons + large numbers
3. Step cards: Numbered badges + icons

**Badges:**
- Rounded full with icon
- Gradient backgrounds
- Border glow effects

## 📱 Responsive Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

## 🎬 Page-Specific Features

### Landing Page (/)

**Sections:**
1. Hero - Parallax background with animated orbs
2. Features - Auto-rotating cards with hover effects
3. Benefits - Metric cards with gradient icons
4. How It Works - Step-by-step with connection line
5. Demo - Video placeholder with play button
6. CTA - Large call-to-action with gradient
7. Footer - Clean minimal design

**Animations:**
- Parallax scrolling on hero elements
- Fade-out on scroll
- Auto-rotating feature cards (4s interval)
- Hover scale on all interactive elements

### Dashboard (/dashboard)

**Features:**
- Real-time WebSocket connection
- Live video feed with detection overlay
- Session controls (Start/Stop/Upload)
- Batch ID validation
- Operator selection

**Animations:**
- Smooth transitions between states
- Loading spinners with gradient
- Success/error notifications
- Video feed fade-in

### Sessions (/sessions)

**Features:**
- Session list with filters
- Search functionality
- Video playback modal (MJPEG)
- Challan generation & preview
- Session detail modal (QR deep-link)
- Delete confirmation

**Animations:**
- Stagger list items
- Hover card effects
- Modal slide-in
- Expand/collapse details

### Analytics (/stats)

**Features:**
- KPI cards with icons
- Throughput trend graph (dynamic range)
- Source split visualization
- Operator leaderboard
- Activity heatmap (24h)
- Top batches
- PDF export

**Animations:**
- Chart animations (500ms)
- Card scale on hover
- Dropdown transitions
- Export button pulse

## 🔧 Technical Stack

**Frontend:**
- React 18
- React Router v6
- Framer Motion
- Recharts
- Lucide React Icons
- Tailwind CSS
- Axios

**Backend:**
- Python Flask
- MongoDB
- OpenCV
- YOLO (Ultralytics)
- ReportLab (PDF generation)

## 🎯 Best Practices

### Performance
1. Lazy load pages with React.lazy()
2. Optimize images and videos
3. Use CSS transforms for animations
4. Debounce search inputs
5. Memoize expensive computations

### Accessibility
1. Semantic HTML elements
2. ARIA labels on interactive elements
3. Keyboard navigation support
4. Focus indicators
5. Color contrast ratios (WCAG AA)

### Code Quality
1. Component composition
2. Custom hooks for logic
3. Context for global state
4. PropTypes or TypeScript
5. ESLint + Prettier

## 🚀 Future Enhancements

1. Dark/Light theme toggle
2. User authentication
3. Multi-language support
4. Advanced filtering
5. Real-time notifications
6. Mobile app (React Native)
7. Offline mode
8. Export to Excel/CSV
9. Custom report builder
10. AI insights & predictions

---

**Version:** 1.0.0  
**Last Updated:** March 21, 2026  
**Maintained by:** WAREgaurd Team
