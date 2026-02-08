# Samay — AI Video-to-Anime Converter

> Transform your videos into stunning anime-style artwork using AI.

Samay is a full-stack application that lets users upload an `.mp4` video (or provide a public URL), extracts frames, processes them through a free AI model on Hugging Face, and reassembles the result into a downloadable anime-styled video.

---

## Tech Stack

| Layer         | Technology                                       |
| ------------- | ------------------------------------------------ |
| **Frontend**  | Next.js (App Router), Tailwind CSS, React        |
| **Backend**   | Next.js API Routes + Express server              |
| **AI Engine** | Hugging Face Inference API (`huggingface.js`)     |
| **Video**     | FFmpeg via `fluent-ffmpeg`                        |
| **Storage**   | Cloudinary (free tier) for video hosting          |
| **Database**  | Supabase (PostgreSQL) for conversion history      |
| **Upload**    | `react-dropzone` for drag-and-drop file uploads   |

---

## Features

- **Drag & Drop Upload**: Upload `.mp4` videos with an intuitive dropzone interface
- **URL Support**: Paste a public video URL to convert
- **Real-time Progress**: Live status bar showing frame-by-frame processing progress
- **Async Processing Queue**: In-memory job queue with Supabase status persistence
- **Conversion History**: View past conversions and download results
- **Dark Mode Zen UI**: Minimalist glassmorphism design with gradient accents

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **FFmpeg** installed and available in your `PATH`
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`
  - Windows: [Download from ffmpeg.org](https://ffmpeg.org/download.html)

### 1. Clone the Repository

```bash
git clone https://github.com/princid/samay.git
cd samay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your credentials:

#### Cloudinary (Free Tier)

1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Go to your **Dashboard** to find:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### Supabase (Free Tier)

1. Sign up at [supabase.com](https://supabase.com/)
2. Create a new project
3. Go to **Settings → API** to find:
   - `NEXT_PUBLIC_SUPABASE_URL` — your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your anonymous key
4. Create the required table by running this SQL in the **SQL Editor**:

```sql
CREATE TABLE conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  original_url TEXT,
  result_url TEXT,
  error_message TEXT,
  frame_count INTEGER,
  processed_frames INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional)
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Allow public access for the app (adjust as needed)
CREATE POLICY "Allow all operations" ON conversions
  FOR ALL USING (true) WITH CHECK (true);
```

#### Hugging Face (Free Tier)

1. Sign up at [huggingface.co](https://huggingface.co/)
2. Go to **Settings → Access Tokens**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Create a new token with **Read** permissions
4. Set `HUGGINGFACE_API_KEY=hf_your_token_here`

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. (Optional) Run the Express Server

The Express server provides an alternative standalone API:

```bash
npx tsx server/index.ts
```

This runs on port `3001` by default.

---

## Project Structure

```
samay/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts    # Video upload API endpoint
│   │   │   ├── status/route.ts    # Conversion status polling
│   │   │   └── history/route.ts   # Conversion history
│   │   ├── globals.css            # Global styles (dark theme)
│   │   ├── layout.tsx             # Root layout with metadata
│   │   └── page.tsx               # Main page (upload + status + history)
│   ├── components/
│   │   ├── UploadZone.tsx         # Drag-and-drop upload component
│   │   ├── ProcessingStatus.tsx   # Real-time progress display
│   │   └── ConversionHistory.tsx  # Past conversions list
│   └── lib/
│       ├── cloudinary.ts          # Cloudinary upload/delete helpers
│       ├── ffmpeg.ts              # Frame extraction & video assembly
│       ├── huggingface.ts         # AI anime stylization
│       ├── queue.ts               # In-memory async processing queue
│       └── supabase.ts            # Database client & CRUD operations
├── server/
│   └── index.ts                   # Standalone Express API server
├── .env.example                   # Environment variable template
├── package.json                   # Dependencies & scripts
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

---

## How It Works

1. **Upload** — User drops an `.mp4` file or pastes a URL
2. **Extract** — FFmpeg extracts video frames at 2 FPS
3. **Transform** — Each frame is sent to the Hugging Face Inference API for anime-style transformation
4. **Reassemble** — Processed frames are combined back into a video using FFmpeg
5. **Store** — The result video is uploaded to Cloudinary and the URL is saved in Supabase
6. **Download** — User downloads the anime-styled video

---

## Environment Variables Reference

| Variable                         | Required | Description                              |
| -------------------------------- | -------- | ---------------------------------------- |
| `CLOUDINARY_CLOUD_NAME`         | Yes      | Your Cloudinary cloud name               |
| `CLOUDINARY_API_KEY`            | Yes      | Your Cloudinary API key                  |
| `CLOUDINARY_API_SECRET`         | Yes      | Your Cloudinary API secret               |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Your Supabase anonymous key              |
| `HUGGINGFACE_API_KEY`           | Yes      | Your Hugging Face access token           |
| `SERVER_PORT`                    | No       | Express server port (default: 3001)      |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.