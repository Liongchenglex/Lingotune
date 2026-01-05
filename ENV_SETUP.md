# Environment Configuration Guide

This project uses separate Firebase projects for development/staging and production environments.

## Important: Firebase Web SDK vs Native SDK

This project uses the **Firebase Web SDK** (not the native SDK), which is the standard approach for Expo projects:

- ✅ Uses `.env` files for configuration (this project)
- ✅ Works with Expo Go and EAS builds
- ✅ No need for `GoogleService-Info.plist` or `google-services.json`
- ✅ Simpler setup, no native code required

**Note:** `GoogleService-Info.plist` is only needed if you're using `react-native-firebase` (native SDK), which requires ejecting from Expo. We're using the standard Expo + Firebase Web SDK approach.

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

#### Getting Firebase Configuration

You can get Firebase config values in two ways:

**Option A: From Web SDK Config (Recommended)**
1. Go to Firebase Console → Your project
2. Click Settings (gear icon) → Project Settings
3. Scroll to "Your apps" section
4. Click "Add app" → Select **Web** (</> icon)
5. Register your app with a nickname (e.g., "LingoTune Web")
6. Copy the `firebaseConfig` object values directly

**Option B: From iOS App Config (GoogleService-Info.plist)**

If you already have an iOS app registered and downloaded `GoogleService-Info.plist`, you can extract the values:

| .env Variable | GoogleService-Info.plist Key |
|---------------|------------------------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `API_KEY` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `{PROJECT_ID}.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `PROJECT_ID` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `STORAGE_BUCKET` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `GCM_SENDER_ID` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `GOOGLE_APP_ID` |

**Note:** The AUTH_DOMAIN is constructed as `{PROJECT_ID}.firebaseapp.com`

#### Development/Staging (`.env.development`)

Copy values from your **staging** Firebase Web app to `.env.development`:

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

Follow the same process for your **production** Firebase project:

**Option A: From Web SDK Config**
1. Go to Firebase Console → Your **production** project
2. Click Settings → Project Settings
3. Scroll to "Your apps" → Add Web app or view existing
4. Copy the `firebaseConfig` values to `.env.production`

**Option B: From iOS Production App**
1. Go to Firebase Console → Your **production** project
2. Add iOS app (or download config from existing iOS app)
3. Download `GoogleService-Info.plist` for production
4. Extract values using the mapping table above

**Example `.env.production`:**
```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_prod_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=1:your_prod_sender_id:ios:your_prod_app_id
```

**Important:** Keep production and staging configurations separate! Use different:
- Firebase project IDs
- Storage buckets
- App IDs
- Bundle identifiers (e.g., `com.yourcompany.lingotune` for prod, `com.yourcompany.lingotune.staging` for staging)

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

## Firebase Configuration: What to Use

| What You Need | Where to Find It | File Type |
|---------------|------------------|-----------|
| ✅ **Web SDK Config** | Firebase Console → Add Web App (</>) | Values for `.env` files |
| ❌ GoogleService-Info.plist | Firebase Console → Add iOS App | Not needed for Expo |
| ❌ google-services.json | Firebase Console → Add Android App | Not needed for Expo |

**For this Expo project:** Only register a **Web app** in Firebase Console and use those values in your `.env` files.

## Managing Multiple Environment Configs

### Best Practice Workflow

1. **Download both GoogleService-Info.plist files** (keep them separate)
   ```bash
   # Download from Firebase Console and rename locally
   GoogleService-Info-staging.plist
   GoogleService-Info-production.plist
   ```

2. **Extract staging values** → `.env.development`
   - Use values from `GoogleService-Info-staging.plist`
   - Or use Web SDK config from staging Firebase project

3. **Extract production values** → `.env.production`
   - Use values from `GoogleService-Info-production.plist`
   - Or use Web SDK config from production Firebase project

4. **Keep plist files secure**
   - Both plist files are in `.gitignore`
   - Store them securely (1Password, LastPass, etc.)
   - Don't commit them to version control

### Quick Reference

| Environment | Branch | Config File | Firebase Project | Bundle ID |
|-------------|--------|-------------|------------------|-----------|
| Staging | `develop` | `.env.development` | lingoleap---staging | com.lexcheng.lingotune.staging |
| Production | `main` | `.env.production` | lingoleap-prod (create this) | com.lexcheng.lingotune |

## Next Steps

1. ✅ Staging configured (`.env.development` has values)
2. ⏳ Create production Firebase project
3. ⏳ Download production `GoogleService-Info.plist` or get Web SDK config
4. ⏳ Fill in `.env.production` with production values
5. ⏳ Test locally with staging environment (`npm start`)
6. ⏳ Set up EAS Build for TestFlight/App Store distribution
7. ⏳ Configure Firebase Security Rules for both projects
