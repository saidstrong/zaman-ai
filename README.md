# Zaman AI - Islamic Finance Assistant

An intelligent chatbot for Islamic banking services, built with Next.js and featuring voice input, product recommendations, financial planning, and spending analysis.

## Features

- 🤖 **AI Chat Assistant** - Powered by Zaman AI with Islamic finance knowledge
- 🎤 **Voice Input** - Speech-to-text functionality with audio recording
- 🔊 **Text-to-Speech** - Audio responses for accessibility
- 💰 **Product Catalog** - Islamic banking products with smart filtering
- 📊 **Financial Planning** - Goal setting and savings calculations
- 📈 **Spending Analysis** - CSV upload and expense categorization
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎯 **RAG Integration** - Retrieval-augmented generation for Islamic finance terms

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Zaman AI API
- **Voice**: Web Speech API + Whisper
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hacknu-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create `.env.local` file:
   ```env
   ZAMAN_BASE_URL=https://openai-hub.neuraldeep.tech
   ZAMAN_API_KEY=your_api_key_here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run check:build` - Build and verify (useful for deployment testing)

## Deploy to Vercel

### 1. Prepare Repository

1. Push this repository to GitHub/GitLab
2. Ensure all environment variables are documented

### 2. Deploy on Vercel

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository

2. **Configure Environment Variables**
   In Project Settings → Environment Variables, add:
   ```
   ZAMAN_BASE_URL = https://openai-hub.neuraldeep.tech
   ZAMAN_API_KEY = <your_token>
   ```
   Apply to both Production and Preview environments.

3. **Framework Detection**
   - Vercel should auto-detect Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next` (auto-detected)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### 3. Post-Deploy Smoke Tests

After deployment, verify these endpoints work:

#### Health Check
```bash
GET /api/health
# Expected: 200 {"ok":true,"ts":1234567890}
```

#### Chat API
```bash
POST /api/chat
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "Привет"}]
}
# Expected: 200 with AI response
```

#### Static Data
```bash
GET /data/products.json
# Expected: 200 with JSON array of products
```

#### UI Pages
- `/` - Chat interface works
- `/products` - Product catalog loads
- `/spending` - Spending analysis page loads
- `/metrics` - Telemetry dashboard shows data

### 4. Production Verification

1. **Test Core Features**
   - Send a message in chat
   - Try voice input (if browser supports)
   - Browse products and click "Оформить"
   - Upload a CSV file in spending analysis

2. **Check Console**
   - No JavaScript errors
   - API calls succeed
   - Telemetry events are logged

3. **Performance**
   - Pages load quickly
   - API responses are fast
   - No memory leaks

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── chat/      # Chat completions
│   │   ├── embeddings/# Embeddings proxy
│   │   ├── stt/       # Speech-to-text
│   │   └── health/    # Health check
│   ├── products/      # Product catalog page
│   ├── spending/      # Spending analysis page
│   ├── metrics/       # Telemetry dashboard
│   └── page.tsx       # Main chat page
├── lib/
│   ├── rag.ts         # RAG implementation
│   ├── telemetry.ts   # Analytics tracking
│   └── utils.ts       # Utility functions
└── public/
    └── data/
        └── products.json  # Product catalog data
```

## API Endpoints

- `POST /api/chat` - Main chat interface
- `POST /api/embeddings` - Text embeddings
- `POST /api/stt` - Speech-to-text conversion
- `GET /api/health` - Health check

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ZAMAN_BASE_URL` | Zaman AI API base URL | Yes |
| `ZAMAN_API_KEY` | API authentication key | Yes |

## Troubleshooting

### Build Issues
- Run `npm run check:build` locally to test build
- Check for TypeScript errors
- Verify all imports are correct

### Runtime Issues
- Check environment variables are set
- Verify API endpoints are accessible
- Check browser console for errors

### Deployment Issues
- Ensure `vercel.json` is in root directory
- Check Vercel function logs
- Verify environment variables in Vercel dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run check:build`
5. Submit a pull request

## License

This project is part of the HackNU hackathon and is for demonstration purposes.

---

**Zaman AI (MVP) — demo build**