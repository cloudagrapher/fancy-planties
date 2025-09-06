# Fancy Planties 🌱

A beautiful, mobile-first Progressive Web App for tracking your plant collection and care schedules.

## Features

- 📱 Mobile-first PWA design
- 🌿 Plant collection management
- 📅 Care schedule tracking
- 🌱 Propagation tracking
- 🔐 Secure user authentication
- 📊 Care analytics and insights

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with custom Fancy Planties theme
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Lucia Auth
- **PWA**: next-pwa
- **Deployment**: Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the database:
   ```bash
   docker-compose up postgres -d
   ```

5. Generate and run database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database Commands

- `npm run db:generate` - Generate migration files
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes (development)
- `npm run db:studio` - Open Drizzle Studio

### Docker Development

To run the entire stack with Docker:

```bash
docker-compose up
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/
│   ├── db/             # Database schema and connection
│   ├── auth/           # Authentication utilities
│   └── utils/          # Utility functions
└── types/              # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
