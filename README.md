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
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication, Firestore, and Storage in your Firebase project
   - Copy `.env.example` to `.env` and fill in your Firebase configuration values

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

## Firebase Setup

After creating your Firebase project:

1. Go to Project Settings > General
2. Add an iOS app and/or Android app
3. Download and note your configuration values
4. Update the `.env` file with your Firebase credentials
5. Enable Email/Password authentication in Firebase Console > Authentication > Sign-in method

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

### Workflow

1. Create feature branches from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```

2. Work on your feature and commit changes

3. When ready, merge back to `develop`:
   ```bash
   git checkout develop
   git merge feature/your-feature-name
   ```

4. After testing on staging, merge `develop` to `main`:
   ```bash
   git checkout main
   git merge develop
   ```

### Current Branch

You are currently on the `develop` branch. Use this for all development work.

## License

Private
