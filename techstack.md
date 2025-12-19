# LingoTune Tech Stack

## Core Technologies

### Frontend Framework
- **React Native** (v0.81.5)
  - Cross-platform mobile development framework
  - Write once, run on iOS and Android
  - Native performance with JavaScript/TypeScript

- **Expo** (~v54.0.30)
  - Development platform for React Native
  - Simplifies build and deployment process
  - Provides access to native APIs
  - Over-the-air (OTA) updates support

### Language
- **JavaScript/TypeScript**
  - Type-safe development with TypeScript support
  - Modern ES6+ features
  - Strong IDE support and autocomplete

## Backend & Services

### Backend as a Service (BaaS)
- **Firebase** (v12.7.0)
  - **Authentication**: User management with email/password
  - **Firestore**: NoSQL cloud database for real-time data
  - **Storage**: Cloud storage for user files and media
  - **Analytics**: Built-in analytics (optional)
  - **Cloud Functions**: Serverless backend logic (can be added)

## State Management

### Context API
- **React Context**
  - Built-in state management
  - AuthContext for authentication state
  - Lightweight alternative to Redux for smaller apps

## Data Persistence

- **AsyncStorage** (@react-native-async-storage/async-storage v2.2.0)
  - Local storage for React Native
  - Persistent key-value storage
  - Caching and offline data

## Development Tools

### Package Manager
- **npm** or **yarn**
  - Dependency management
  - Script execution

### Build & Development
- **Expo CLI**
  - Development server
  - Build and deployment tools
  - EAS Build for production builds

## Project Architecture

### Design Pattern
- **Component-Based Architecture**
  - Reusable UI components
  - Screen-level components
  - Service layer for business logic

### Folder Structure
```
src/
├── components/    # Reusable UI components
├── screens/       # Screen-level components
├── contexts/      # React Context providers
├── services/      # Firebase and API services
├── hooks/         # Custom React hooks
├── utils/         # Helper functions
└── types/         # TypeScript definitions
```

## Platform Support

### Mobile
- **iOS**: iOS 13+
- **Android**: Android 5.0+ (API 21+)

### Testing & Development
- **Expo Go**: Quick testing on physical devices
- **iOS Simulator**: Mac-based iOS testing
- **Android Emulator**: Android testing

## Security

- **Firebase Security Rules**: Database and storage access control
- **Environment Variables**: Sensitive configuration management (.env)
- **Authentication**: Secure user authentication via Firebase Auth

## Future Considerations

### Potential Additions
- **React Navigation**: For complex navigation flows
- **Redux/Zustand**: If state management needs grow
- **TypeScript**: Full TypeScript migration for type safety
- **Jest/React Native Testing Library**: Unit and integration testing
- **Expo EAS**: For production builds and app store deployment
- **Firebase Cloud Functions**: Serverless backend logic
- **Push Notifications**: Using Firebase Cloud Messaging (FCM)
- **Crash Reporting**: Firebase Crashlytics

## Getting Started

See `README.md` for installation and setup instructions.

## Configuration Files

- `package.json`: Project dependencies and scripts
- `app.json`: Expo configuration
- `.env`: Environment variables (create from `.env.example`)
- `tsconfig.json`: TypeScript configuration (if using TypeScript)

## Notes

- The project uses Firebase Web SDK, which works with React Native through Expo
- No native code modifications required for basic Firebase features
- Easy deployment to App Store and Google Play via Expo EAS Build
