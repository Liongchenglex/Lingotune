import 'dotenv/config';

export default {
  expo: {
    name: 'LingoTune',
    slug: 'lingotune',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.lingotune',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.yourcompany.lingotune',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // Expose environment to the app
      env: process.env.EXPO_PUBLIC_ENV || 'development',
      eas: {
        projectId: 'your-eas-project-id', // Add your EAS project ID here after running `eas build:configure`
      },
    },
  },
};
