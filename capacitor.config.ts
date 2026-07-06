import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ccstechnology.atheer',
  appName: 'Atheer',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      // The plugin runs the native Google OAuth flow and returns a credential;
      // we then sign the Firebase JS SDK in with it so the whole app
      // (onAuthStateChanged, ProtectedRoute) keeps a single source of truth.
      // skipNativeAuth avoids a redundant native-SDK session.
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
