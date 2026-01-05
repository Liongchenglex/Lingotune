# Environment Configuration Guide

This project uses separate Firebase projects for development/staging and production environments.

## Overview

**This project uses Firebase Web SDK with Expo:**
- Configuration comes from `.env` files (NOT plist files)
- `.env.development` → Staging Firebase project
- `.env.production` → Production Firebase project
- Works seamlessly with Expo Go and EAS builds

## Setup Steps

### 1. Create Two Firebase Projects

Create two separate Firebase projects in the [Firebase Console](https://console.firebase.google.com):

1. **Staging Project**: `lingotune-staging` (or similar)
2. **Production Project**: `lingotune-prod` (or similar)

For each project:
- Enable Authentication → Email/Password
- Create Firestore Database
- Enable Storage

### 2. Get Firebase Configuration Values

For each Firebase project, you need to get the configuration values. Choose whichever method is easier for you:

#### Option A: From Web SDK Config (Simplest)

1. Go to Firebase Console → Your project
2. Click Settings (gear icon) → Project Settings
3. Scroll to "Your apps" section
4. Click "Add app" → Select **Web** (</> icon)
5. Register your app with a nickname (e.g., "LingoTune Staging")
6. You'll see a `firebaseConfig` object - copy those values

#### Option B: From iOS App Config (If You Already Have It)

If you already registered an iOS app and have `GoogleService-Info.plist`:

1. Open the plist file in a text editor
2. Extract these values:

| What You Need | Where to Find It in Plist |
|---------------|---------------------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `API_KEY` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `PROJECT_ID` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `STORAGE_BUCKET` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `GCM_SENDER_ID` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `GOOGLE_APP_ID` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Not in plist - use `{PROJECT_ID}.firebaseapp.com` |

**Note:** The plist file is just for extracting values. You don't keep it in your codebase.

### 3. Fill in Environment Files

#### Staging Configuration (`.env.development`)

Open `.env.development` and replace the placeholder values with your **staging** Firebase config:

```env
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-staging-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-staging-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-staging-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123
```

#### Production Configuration (`.env.production`)

Open `.env.production` and replace the placeholder values with your **production** Firebase config:

```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=987654321
EXPO_PUBLIC_FIREBASE_APP_ID=1:987654321:ios:xyz789
```

**Important:** Use different values for staging and production! Don't copy-paste the same config.

## Usage

### Local Development (Uses Staging)

```bash
npm start
```

This automatically loads `.env.development` and connects to your staging Firebase project.

### Building for Production

#### Install EAS CLI (First Time Only)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

#### Build Staging App (TestFlight/Internal Testing)

```bash
# iOS staging build
eas build --platform ios --profile development

# Android staging build
eas build --platform android --profile development
```

Uses `.env.development` (staging Firebase).

#### Build Production App (App Store/Play Store)

```bash
# Switch to main branch first
git checkout main

# Build production iOS
eas build --platform ios --profile production

# Build production Android
eas build --platform android --profile production
```

Uses `.env.production` (production Firebase).

#### Submit to App Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## How It Works

1. **app.config.ts** loads environment variables via `dotenv/config`
2. Expo automatically selects the right `.env` file:
   - Local development → `.env.development`
   - Production builds → `.env.production` (via `eas.json`)
3. Firebase service (`src/services/firebase.ts`) reads values from `process.env`
4. Console logs show which environment is active

## Verification

Start your app and check the console:

```bash
npm start
```

You should see:
```
🔥 Firebase initialized in development mode
📦 Project ID: your-staging-project
```

For production builds, you'll see:
```
🔥 Firebase initialized in production mode
📦 Project ID: your-prod-project
```

## Security

- ✅ `.env.development` and `.env.production` are tracked in git with actual values
- ✅ Firebase API keys are safe to expose (protected by Firebase Security Rules)
- ⚠️ Configure Firebase Security Rules to protect your data
- ⚠️ Never commit sensitive secrets (use Firebase for auth, not hardcoded keys)

## Troubleshooting

### Variables showing as undefined

1. Restart Expo dev server: `npm start`
2. Clear cache: `npx expo start -c`
3. Check that values in `.env.development` have no quotes or spaces

### Wrong Firebase project connecting

Check the console logs to see which project ID is being used. Make sure you're on the right git branch (`develop` for staging, `main` for production).

### EAS Build using wrong environment

1. Verify `eas.json` has correct env variables in each profile
2. Check you're using the right build profile (`--profile development` vs `--profile production`)

## Quick Reference

| Environment | Branch | Config File | Command |
|-------------|--------|-------------|---------|
| **Staging** | `develop` | `.env.development` | `npm start` |
| **Production** | `main` | `.env.production` | `eas build --profile production` |

## Next Steps

1. ✅ Staging configured (`.env.development` has values)
2. ⏳ Create production Firebase project
3. ⏳ Get production config values (Web SDK or from plist)
4. ⏳ Fill in `.env.production`
5. ⏳ Test locally: `npm start`
6. ⏳ Set up Firebase Security Rules for both projects
7. ⏳ Build and test with EAS when ready for TestFlight
