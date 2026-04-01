# Dyno Dashboard 🦕

A personal life dashboard powered by AI that connects to Supabase for comprehensive life tracking and optimization.

## Features

### 🏠 Dashboard Pages
- **Home**: Life Score Dashboard with holistic health metrics
- **Nutrition**: Macro tracking, meal history, and nutrition analytics
- **Weight & Exercise**: Fitness trends, workout tracking, and progress visualization  
- **Journal**: Visual display of daily journal entries
- **Memory**: AI memory system visualization
- **Chat**: Embedded Dyno AI chat widget

### 🔧 Technical Features
- Dynamic page system with configurable layouts
- Dark mode support
- Responsive design for all devices
- Real-time data sync with Supabase
- Chrome extension for quick access

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + Lucide Icons
- **Data**: Supabase (PostgreSQL + real-time)
- **Charts**: Recharts
- **Deployment**: Netlify

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Environment Variables

Create a `.env.local` file:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Chrome Extension

The `/extension` folder contains a Chrome extension for:
- Embedded chat with Dyno AI
- Quick bookmark search
- Shortcut links to dashboard pages

Built with Manifest V3 for modern Chrome compatibility.

## Deployment

Automatically deploys to Netlify on push to main branch.

---

**Built for Harry Schlechter** | Personal Life OS Project
