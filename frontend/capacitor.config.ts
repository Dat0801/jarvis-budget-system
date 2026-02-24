import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Jarvis Budget',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
