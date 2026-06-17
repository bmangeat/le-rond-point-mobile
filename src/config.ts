import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl: string;
  /** Web app base URL used to build shareable invite links (.../invite/:token). */
  inviteBaseUrl: string;
  googleWebClientId: string;
  googleIosClientId: string;
  googleAndroidClientId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const config = {
  /** Base URL of the NestJS API, including the `/api` global prefix. */
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3001/api',
  inviteBaseUrl: extra.inviteBaseUrl ?? 'https://lerondpoint.app',
  google: {
    webClientId: extra.googleWebClientId ?? '',
    iosClientId: extra.googleIosClientId ?? '',
    androidClientId: extra.googleAndroidClientId ?? '',
  },
};
