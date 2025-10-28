# Getting Started Guide

Welcome to Fancy Planties! This guide will help you set up the application and get started tracking your plant collection.

## 🎯 What is Fancy Planties?

Fancy Planties is a Progressive Web App (PWA) designed to help plant enthusiasts manage their collections with:

- **Plant Collection Management**: Track individual plants with detailed taxonomy
- **Care Scheduling**: Automated fertilizer and repotting reminders
- **Propagation Tracking**: Monitor propagation success from start to finish
- **Mobile-First Design**: Native app experience on any device
- **Offline Support**: Works without internet connection

## 🚀 Quick Setup

### For Users (No Development)

If you just want to use the app:

1. **Visit the deployed application** (ask your administrator for the URL)
2. **Install as PWA**:
   - **Mobile**: Tap "Add to Home Screen" when prompted
   - **Desktop**: Click the install icon in your browser's address bar
3. **Create an account** and start adding plants!

### For Developers

#### Prerequisites

- **Node.js 20+**: [Download here](https://nodejs.org/)
- **Docker**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git**: [Install Git](https://git-scm.com/downloads)

#### Installation Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd fancy-planties
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit with your preferred editor
   nano .env.local  # or code .env.local
   ```

   **Required environment variables:**
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fancy_planties"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

4. **Start the database**

   ```bash
   # Start PostgreSQL in Docker
   docker compose up -d postgres
   
   # Wait for database to be ready (about 10 seconds)
   ```

5. **Set up the database**

   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Optional: Open Drizzle Studio to view database
   npm run db:studio
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 First Steps in the App

### 1. Create Your Account

1. Click "Sign Up" on the welcome page
2. Enter your email and password
3. Click "Create Account"
4. You'll be automatically logged in

### 2. Add Your First Plant

1. Navigate to the **Plants** tab (bottom navigation)
2. Tap the **"+"** button to add a plant
3. **Search for plant type** or **"Add new plant type"** if it doesn't exist
4. Fill in plant details:
   - **Nickname**: Give your plant a personal name
   - **Location**: Where you keep it (e.g., "Living room window")
   - **Care schedule**: Set fertilizer frequency
5. **Add photos** (optional but recommended)
6. Tap **"Save"** to add your plant

### 3. Set Up Care Schedules

1. When adding a plant, set the **fertilizer schedule**
2. Log your **last fertilizer date** if applicable
3. The app will automatically calculate when care is due
4. Check the **Care** tab to see upcoming tasks

### 4. Track Propagations

1. Go to the **Propagation** tab
2. Tap **"+"** to start tracking a propagation
3. Choose source:
   - **From your plants**: Select a parent plant
   - **External source**: Gift, trade, or purchase
4. Update status as your propagation progresses:
   - Started → Rooting → Planted → Established
5. Convert successful propagations to full plants

### 5. Import Existing Data (Optional)

If you have plant data in spreadsheets:

1. Go to the **Profile** tab
2. Tap **"Import Data"**
3. Choose your CSV file type:
   - **Plant List**: Basic plant information
   - **Care Schedule**: Plants with fertilizer schedules
   - **Propagations**: Propagation tracking data
4. Follow the import wizard to map your data

## 🎨 Understanding the Interface

### Bottom Navigation

- **🌿 Plants**: Your plant collection grid
- **❤️ Care**: Care tasks and scheduling
- **🌱 Propagation**: Propagation tracking
- **👤 Profile**: Settings and data management

### Plant Cards

Each plant card shows:
- **Primary photo** (if uploaded)
- **Plant nickname** and scientific name
- **Location** where you keep it
- **Care status** indicator (green = good, yellow = due soon, red = overdue)

### Care Dashboard

The Care tab organizes tasks by urgency:
- **🔴 Overdue**: Needs immediate attention
- **🟡 Due Today**: Should be done today
- **🟢 Upcoming**: Due in the next week

## 💡 Pro Tips

### Plant Management
- **Use clear photos**: Take photos in good lighting for easy identification
- **Consistent naming**: Use a consistent location naming scheme
- **Regular updates**: Log care activities to keep schedules accurate

### Care Tracking
- **Set realistic schedules**: Start with manufacturer recommendations, adjust based on your plants' needs
- **Use quick actions**: Tap care task cards for one-tap logging
- **Check regularly**: Visit the Care tab weekly to stay on top of tasks

### Propagation Success
- **Document everything**: Take photos at each stage
- **Track timing**: Note how long each stage takes for future reference
- **External sources**: Don't forget to track gifts and trades too!

### Data Organization
- **Backup regularly**: Use the export feature to backup your data
- **Clean up**: Remove inactive plants to keep your collection current
- **Search effectively**: Use the search bar to quickly find specific plants

## 🔧 Troubleshooting

### Common Issues

#### App Won't Load
- Check your internet connection
- Try refreshing the page (Ctrl+R or Cmd+R)
- Clear browser cache and cookies
- Try a different browser

#### Can't Add Plants
- Make sure you're logged in
- Check that all required fields are filled
- Try refreshing the page

#### Images Won't Upload
- Check image file size (max 5MB recommended)
- Ensure image is in supported format (JPG, PNG, WebP)
- Try a smaller image or compress it first

#### Care Dates Wrong
- Check your device's date and time settings
- Verify the fertilizer schedule is set correctly
- Re-log the last care date if needed

### Development Issues

#### Database Connection Errors
```bash
# Check if PostgreSQL is running
docker compose ps

# Restart database
docker compose restart postgres

# Check logs
docker compose logs postgres
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

## 📚 Next Steps

Once you're comfortable with the basics:

1. **Explore advanced features**:
   - Bulk plant management
   - Advanced search and filtering
   - Care analytics and insights

2. **Customize your experience**:
   - Adjust care schedules based on your plants' responses
   - Organize plants by location or care needs
   - Set up notification preferences

3. **Contribute to the project**:
   - Report bugs or suggest features
   - Contribute plant taxonomy data
   - Help improve documentation

## 🆘 Getting Help

- **Documentation**: Check other guides in the `/docs` folder
- **Issues**: [Report bugs on GitHub](https://github.com/your-repo/fancy-planties/issues)
- **Discussions**: [Join community discussions](https://github.com/your-repo/fancy-planties/discussions)
- **Email**: Contact the maintainers directly

---

**Happy plant parenting! 🌱** Your plants will thank you for the organized care tracking!