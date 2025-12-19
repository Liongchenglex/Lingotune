# Environment Configuration Guide

This project uses separate Firebase projects for development/staging and production environments.

## Overview

- **Development/Staging**: Uses `.env.development` → Firebase staging project
- **Production**: Uses `.env.production` → Firebase production project

## Setup Steps

### 1. Create Two Firebase Projects

Create two separate Firebase projects in the [Firebase Console](https://console.firebase.google.com):

1. **Staging Project**: `lingotune-staging` (or similar)
2. **Production Project**: `lingotune-prod` (or similar)

For each project:
- Enable Authentication → Email/Password
- Create Firestore Database
- Enable Storage

### 2. Configure Environment Files

#### Development/Staging (`.env.development`)

1. Go to Firebase Console → Your staging project
2. Click Settings (gear icon) → Project Settings
3. Scroll to "Your apps" → Add app or select existing
4. Copy configuration values to `.env.development`:

```env
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_FIREBASE_API_KEY=your_staging_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-staging-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-staging-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-staging-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_staging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_staging_app_id
```

#### Production (`.env.production`)

1. Go to Firebase Console → Your production project
2. Click Settings → Project Settings
3. Copy configuration values to `.env.production`:

```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_prod_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_prod_app_id
```

## Usage

### Local Development (Expo Go)

By default, Expo uses `.env.development`:

```bash
npm start
# or
npx expo start
```

The app will automatically connect to your **staging Firebase project**.

### Building for Production

#### Using EAS Build

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

4. Build for iOS (TestFlight/App Store):
```bash
# Development build (staging)
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

5. Build for Android:
```bash
# Development build (staging)
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

#### Submit to App Stores

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

## How It Works

### Environment Loading

1. **app.config.ts** imports `dotenv/config` at the top
2. Expo automatically loads the correct `.env` file:
   - `.env.development` for local development
   - `.env.production` for production builds (via `eas.json`)

### Accessing Environment Variables

**Option A: Direct access (recommended)**
```typescript
const env = process.env.EXPO_PUBLIC_ENV;
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
```

**Option B: Via Constants**
```typescript
import Constants from 'expo-constants';
const env = Constants.expoConfig?.extra?.env;
```

### Build Profiles (eas.json)

Three profiles are configured:

1. **development**: Internal distribution with dev environment
2. **preview**: Internal testing with dev environment
3. **production**: App store distribution with prod environment

## Verification

To verify your setup is working:

1. Start the app:
```bash
npm start
```

2. Check the console for:
```
🔥 Firebase initialized in development mode
📦 Project ID: your-staging-project
```

3. For production builds, you should see:
```
🔥 Firebase initialized in production mode
📦 Project ID: your-prod-project
```

## Security Notes

- ✅ `.env.development` and `.env.production` are tracked in git (contain placeholders)
- ✅ Fill in actual values before running the app
- ✅ Firebase API keys are safe to expose (they're restricted by Firebase Security Rules)
- ⚠️ Never commit files with real credentials to public repositories
- ⚠️ Use Firebase Security Rules to protect your data

## Troubleshooting

### Environment not loading

If variables are `undefined`:
1. Restart the Expo dev server (`npm start`)
2. Clear cache: `npx expo start -c`
3. Verify `.env.development` exists and has correct format

### Wrong Firebase project

Check the console logs to see which project ID is being used. The environment should match your expectations.

### EAS Build issues

1. Ensure you've run `eas build:configure`
2. Check that `eas.json` has correct environment variables
3. Verify your EAS project ID in `app.config.ts`

## Next Steps

1. Fill in your actual Firebase credentials in both `.env` files
2. Test locally with staging environment
3. Set up EAS Build for TestFlight/App Store distribution
4. Configure Firebase Security Rules for both projects
