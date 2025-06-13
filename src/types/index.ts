// Mood Analysis Types
export interface MoodAnalysis {
  primaryEmotion: string;
  emotions: {
    happy: number;
    sad: number;
    energetic: number;
    calm: number;
    anxious: number;
    nostalgic: number;
  };
  confidence: number;
  rawText: string;
}

export interface MoodRequest {
  text: string;
}

// Spotify Types
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  speechiness: number;
  tempo: number;
  valence: number;
}

export interface SpotifyAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

// Playlist Types
export interface PlaylistRequest {
  moodAnalysis: MoodAnalysis;
  accessToken: string;
  userId: string;
}

export interface GeneratedPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  external_urls: {
    spotify: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Mood to Music Mapping
export interface MoodMusicProfile {
  genres: string[];
  audioFeatures: {
    energy: { min: number; max: number };
    valence: { min: number; max: number };
    danceability: { min: number; max: number };
    tempo: { min: number; max: number };
  };
  keywords: string[];
}