# Fancy Planties 🌱

A comprehensive plant management Progressive Web Application (PWA) built with Next.js 15, featuring mobile-native bottom navigation and offline capabilities. Track your plant collection, care schedules, propagations, and more with an intuitive, touch-optimized interface.

## ✨ Features

### 🌿 Plant Management
- **Plant Collection**: Organize your plants with detailed taxonomy (family, genus, species, cultivar)
- **Plant Instances**: Track individual plants with custom nicknames, locations, and care history
- **Smart Search**: Fuzzy search across all plant data with autocomplete suggestions
- **Image Gallery**: Upload and manage multiple photos per plant with Base64 storage

### 📅 Care Tracking
- **Care Dashboard**: Visual overview of overdue, due today, and upcoming care tasks
- **Fertilizer Scheduling**: Automated scheduling with customizable intervals
- **Care History**: Complete timeline of all care activities
- **Quick Actions**: Fast care logging with one-tap actions

### 🌱 Propagation Management
- **Flexible Sources**: Track propagations from your plants OR external sources (gifts, trades, purchases)
- **Status Tracking**: Monitor progress through rooting, planting, and establishment stages
- **Success Analytics**: View propagation success rates and timing statistics
- **Plant Conversion**: Convert successful propagations to full plant instances

### 📱 Mobile-Native Experience
- **Bottom Navigation**: Native app-like navigation with Plants, Care, Propagation, and Profile tabs
- **PWA Features**: Install as native app with offline support and push notifications
- **Touch Optimized**: Swipe gestures, haptic feedback, and thumb-friendly design
- **Responsive Design**: Seamless experience across mobile, tablet, and desktop

### 📊 Data Management
- **CSV Import/Export**: Bulk import existing plant data from spreadsheets
- **User Authentication**: Secure account system with data segregation
- **Offline Support**: View and log care activities without internet connection
- **Backup & Sync**: Automatic data synchronization when connectivity returns

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd fancy-planties
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development environment**

   ```bash
   # Start database
   docker-compose up -d postgres
   
   # Run database migrations
   npm run db:migrate
   
   # Start development server
   npm run dev
   ```

5. **Open the application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Create an account and start adding plants!

### Production Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for comprehensive deployment instructions.

## 📖 Documentation

- [**Getting Started Guide**](./docs/GETTING_STARTED.md) - Detailed setup and first steps
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Production deployment instructions
- [**API Documentation**](./docs/API.md) - REST API reference
- [**Contributing Guide**](./docs/CONTRIBUTING.md) - Development guidelines
- [**Architecture Overview**](./docs/ARCHITECTURE.md) - Technical architecture details

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 15 App Router | React framework with SSR and static generation |
| **Database** | PostgreSQL + Drizzle ORM | Relational database with type-safe queries |
| **Authentication** | Lucia Auth | Session-based authentication |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **PWA** | next-pwa | Progressive Web App features |
| **Testing** | Jest + Cypress | Unit, integration, and E2E testing |
| **Deployment** | Docker + Nginx | Containerized deployment with reverse proxy |

## 📱 Mobile App Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add" to install

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Tap "Add" to install

### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install Fancy Planties"
3. The app will open in its own window

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 📊 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run deploy:production` | Deploy to production |
| `npm run backup:create` | Create database backup |

## 🔒 Security Features

- **Authentication**: Secure session-based auth with bcrypt password hashing
- **Data Isolation**: Row-level security ensures user data segregation
- **Security Headers**: Comprehensive security headers via Nginx
- **Input Validation**: Zod schema validation on all inputs
- **HTTPS**: SSL/TLS encryption in production
- **Rate Limiting**: API rate limiting to prevent abuse

## 🌍 Browser Support

- **Mobile**: iOS Safari 14+, Android Chrome 90+
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **PWA**: Full PWA support on all modern browsers

## 📈 Performance

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s  
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 250KB gzipped
- **Lighthouse Score**: 95+ across all metrics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/fancy-planties/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/fancy-planties/discussions)
- **Documentation**: [Project Wiki](https://github.com/your-repo/fancy-planties/wiki)

## 🙏 Acknowledgments

- Plant taxonomy data structure inspired by botanical standards
- PWA implementation following Google's best practices
- Mobile-first design principles from Material Design and iOS HIG
- Security practices based on OWASP recommendations

---

**Happy Plant Parenting! 🌱✨**