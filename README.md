# Spring-Ford Press

A modern news website built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- 📰 Article management system with rich text editor
- 🔐 User authentication (email, Google OAuth)
- 👥 Admin and Super Admin roles
- 🚨 Breaking news with duration control
- 📅 Scheduled article publishing
- 🖼️ Image uploads with captions
- 📱 Responsive design
- 🔍 SEO optimization
- 💬 Comments system (ready)

## Tech Stack

- **Framework:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dylancobb2525/springford-press.git
cd springford-press
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
- Run the SQL migrations in order:
  1. `supabase-schema.sql`
  2. `supabase-migration-account-number.sql`
  3. `supabase-articles-update.sql`
  4. `supabase-blocks-migration.sql`
  5. `supabase-auto-publish.sql`
  6. `supabase-breaking-news-duration.sql`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions to Vercel.

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Update Supabase redirect URLs
5. Deploy!

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── article/           # Article display pages
│   ├── auth/              # Authentication pages
│   └── page.tsx           # Homepage
├── components/            # React components
├── lib/                   # Utilities and Supabase clients
├── public/                # Static assets
└── supabase-*.sql         # Database migrations
```

## Documentation

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Supabase Email Setup](./SUPABASE_EMAIL_SETUP.md)
- [Article System Guide](./ARTICLE_SYSTEM_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

## License

Private project - All rights reserved
