# LingoTune

A mobile application built with Expo and Firebase.

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create two Firebase projects at https://console.firebase.google.com (staging and production)
   - Enable Authentication, Firestore, and Storage in both projects
   - Fill in your Firebase credentials in `.env.development` (staging) and `.env.production`
   - See `ENV_SETUP.md` for detailed environment configuration instructions

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on your preferred platform:
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## Project Structure

```
lingotune/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── services/       # Firebase and API services
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript type definitions
├── assets/             # Images, fonts, etc.
├── App.tsx             # Main app component
└── app.json            # Expo configuration
```

## Features

- Firebase Authentication (Email/Password)
- Firestore Database
- Firebase Storage
- Basic authentication flow

## Environment Configuration

This project uses separate environments for development and production:

- **Development**: Uses `.env.development` with staging Firebase project
- **Production**: Uses `.env.production` with production Firebase project

For detailed setup instructions, see `ENV_SETUP.md`.

## Git Workflow

This project uses a two-branch workflow:

### Branches

- **main** - Production branch
  - Deployed to production environment
  - Only merge from `develop` after thorough testing
  - All commits should be stable and production-ready

- **develop** - Staging branch
  - Deployed to staging environment for testing
  - Main development branch where features are integrated
  - Merge feature branches here first

### Development Workflow

#### 1. Working on Features (develop branch)

Create feature branches from `develop`:
```bash
git checkout develop
git checkout -b feature/your-feature-name
```

**Run locally with staging environment:**
```bash
npm start
# or explicitly
npm run start:dev
```
- Loads `.env.development`
- Connects to staging Firebase project
- Safe for testing without affecting production data

#### 2. Testing Feature on Staging

When ready, merge back to `develop`:
```bash
git checkout develop
git merge feature/your-feature-name
```

**Build staging app for TestFlight/internal testing:**
```bash
# Install EAS CLI (first time only)
npm install -g eas-cli
eas login

# Build for iOS staging
eas build --platform ios --profile development

# Build for Android staging
eas build --platform android --profile development
```
- Uses `.env.development` (staging Firebase)
- Internal distribution for testing

#### 3. Promoting to Production (main branch)

After thorough testing on staging, merge `develop` to `main`:
```bash
git checkout main
git merge develop
```

**Build production app for App Store/Play Store:**
```bash
# Build production iOS
eas build --platform ios --profile production

# Build production Android
eas build --platform android --profile production
```
- Uses `.env.production` (production Firebase)
- Suitable for App Store/Play Store submission

**Submit to stores:**
```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

### Environment Loading Summary

| Command | Branch | Env File | Firebase Project | Use Case |
|---------|--------|----------|------------------|----------|
| `npm start` | develop | `.env.development` | Staging | Local development |
| `eas build --profile development` | develop | `.env.development` | Staging | TestFlight/internal |
| `eas build --profile production` | main | `.env.production` | Production | App Store/Play Store |

### Current Branch

You are currently on the `develop` branch. Use this for all development work.

## License

Private
