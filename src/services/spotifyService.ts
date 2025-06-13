import axios from 'axios';
import { SpotifyAuthTokens, SpotifyTrack, SpotifyUser, SpotifyAudioFeatures } from '../types';

export class SpotifyService {
  private readonly clientId = process.env.SPOTIFY_CLIENT_ID!;
  private readonly clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  private readonly redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  
  private readonly baseUrl = 'https://api.spotify.com/v1';
  private readonly authUrl = 'https://accounts.spotify.com';

  // Generate authorization URL
  getAuthUrl(): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: this.generateRandomString(16)
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code: string): Promise<SpotifyAuthTokens> {
    try {
      const response = await axios.post(
        `${this.authUrl}/api/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to get access token');
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<SpotifyAuthTokens> {
    try {
      const response = await axios.post(
        `${this.authUrl}/api/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get user profile
  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  // Search for tracks based on criteria
  async searchTracks(
    accessToken: string,
    query: string,
    limit: number = 50
  ): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          type: 'track',
          limit,
          market: 'US'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.tracks.items;
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw new Error('Failed to search tracks');
    }
  }

  // Get audio features for tracks
  async getAudioFeatures(
    accessToken: string,
    trackIds: string[]
  ): Promise<SpotifyAudioFeatures[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/audio-features`, {
        params: {
          ids: trackIds.join(',')
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.audio_features.filter((features: any) => features !== null);
    } catch (error) {
      console.error('Error getting audio features:', error);
      throw new Error('Failed to get audio features');
    }
  }

  // Create a playlist
  async createPlaylist(
    accessToken: string,
    userId: string,
    name: string,
    description: string,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/users/${userId}/playlists`,
        {
          name,
          description,
          public: isPublic
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw new Error('Failed to create playlist');
    }
  }

  // Add tracks to playlist
  async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/playlists/${playlistId}/tracks`,
        {
          uris: trackUris
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      throw new Error('Failed to add tracks to playlist');
    }
  }

  // Get recommendations based on seed data
  async getRecommendations(
    accessToken: string,
    seedGenres: string[],
    audioFeatures: any,
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    try {
      const params: any = {
        seed_genres: seedGenres.slice(0, 5).join(','), // Max 5 seeds
        limit,
        market: 'US'
      };

      // Add audio feature targets
      if (audioFeatures.energy) {
        params.target_energy = audioFeatures.energy;
      }
      if (audioFeatures.valence) {
        params.target_valence = audioFeatures.valence;
      }
      if (audioFeatures.danceability) {
        params.target_danceability = audioFeatures.danceability;
      }
      if (audioFeatures.tempo) {
        params.target_tempo = audioFeatures.tempo;
      }

      const response = await axios.get(`${this.baseUrl}/recommendations`, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.tracks;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error('Failed to get recommendations');
    }
  }

  // Get available genres
  async getAvailableGenres(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/recommendations/available-genre-seeds`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.genres;
    } catch (error) {
      console.error('Error getting available genres:', error);
      return []; // Return empty array if fails
    }
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}