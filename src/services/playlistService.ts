import { MoodAnalysis, MoodMusicProfile, SpotifyTrack, GeneratedPlaylist } from '../types';
import { SpotifyService } from './spotifyService';

export class PlaylistService {
  private spotifyService = new SpotifyService();

  // Mood to music mapping configuration
  private moodProfiles: Record<string, MoodMusicProfile> = {
    happy: {
      genres: ['pop', 'dance', 'funk', 'disco', 'reggae'],
      audioFeatures: {
        energy: { min: 0.6, max: 1.0 },
        valence: { min: 0.6, max: 1.0 },
        danceability: { min: 0.5, max: 1.0 },
        tempo: { min: 100, max: 180 }
      },
      keywords: ['upbeat', 'positive', 'celebration', 'sunshine', 'party']
    },
    sad: {
      genres: ['indie', 'alternative', 'folk', 'blues', 'singer-songwriter'],
      audioFeatures: {
        energy: { min: 0.0, max: 0.5 },
        valence: { min: 0.0, max: 0.4 },
        danceability: { min: 0.0, max: 0.5 },
        tempo: { min: 60, max: 100 }
      },
      keywords: ['melancholy', 'heartbreak', 'rain', 'alone', 'emotional']
    },
    energetic: {
      genres: ['rock', 'electronic', 'hip-hop', 'punk', 'metal'],
      audioFeatures: {
        energy: { min: 0.7, max: 1.0 },
        valence: { min: 0.4, max: 1.0 },
        danceability: { min: 0.6, max: 1.0 },
        tempo: { min: 120, max: 200 }
      },
      keywords: ['workout', 'adrenaline', 'power', 'intense', 'drive']
    },
    calm: {
      genres: ['ambient', 'classical', 'new-age', 'lo-fi', 'acoustic'],
      audioFeatures: {
        energy: { min: 0.0, max: 0.4 },
        valence: { min: 0.3, max: 0.7 },
        danceability: { min: 0.0, max: 0.4 },
        tempo: { min: 60, max: 100 }
      },
      keywords: ['peaceful', 'meditation', 'sleep', 'nature', 'zen']
    },
    anxious: {
      genres: ['indie-rock', 'alternative', 'electronic', 'experimental'],
      audioFeatures: {
        energy: { min: 0.3, max: 0.7 },
        valence: { min: 0.2, max: 0.6 },
        danceability: { min: 0.3, max: 0.7 },
        tempo: { min: 80, max: 140 }
      },
      keywords: ['restless', 'uncertainty', 'tension', 'introspective']
    },
    nostalgic: {
      genres: ['oldies', 'classic-rock', 'soul', 'jazz', 'country'],
      audioFeatures: {
        energy: { min: 0.2, max: 0.7 },
        valence: { min: 0.3, max: 0.8 },
        danceability: { min: 0.3, max: 0.7 },
        tempo: { min: 70, max: 130 }
      },
      keywords: ['memories', 'vintage', 'throwback', 'classic', 'timeless']
    }
  };

  async generatePlaylist(
    moodAnalysis: MoodAnalysis,
    accessToken: string,
    userId: string
  ): Promise<GeneratedPlaylist> {
    try {
      // Get mood profile
      const profile = this.moodProfiles[moodAnalysis.primaryEmotion];
      if (!profile) {
        throw new Error(`Unknown mood: ${moodAnalysis.primaryEmotion}`);
      }

      // Get available genres from Spotify
      const availableGenres = await this.spotifyService.getAvailableGenres(accessToken);
      const filteredGenres = profile.genres.filter(genre => 
        availableGenres.includes(genre)
      ).slice(0, 3); // Use max 3 genres

      if (filteredGenres.length === 0) {
        // Fallback to popular genres if none match
        filteredGenres.push('pop');
      }

      // Calculate target audio features based on mood confidence
      const targetFeatures = this.calculateTargetFeatures(
        profile.audioFeatures,
        moodAnalysis.confidence
      );

      // Get recommendations from Spotify
      const recommendedTracks = await this.spotifyService.getRecommendations(
        accessToken,
        filteredGenres,
        targetFeatures,
        30 // Get more tracks than needed for filtering
      );

      // Filter and select best tracks
      const selectedTracks = await this.filterAndSelectTracks(
        recommendedTracks,
        targetFeatures,
        accessToken,
        15 // Target playlist length
      );

      // Generate playlist name and description
      const playlistName = this.generatePlaylistName(moodAnalysis);
      const playlistDescription = this.generatePlaylistDescription(moodAnalysis);

      // Create playlist on Spotify
      const playlist = await this.spotifyService.createPlaylist(
        accessToken,
        userId,
        playlistName,
        playlistDescription,
        false
      );

      // Add tracks to playlist
      const trackUris = selectedTracks.map(track => `spotify:track:${track.id}`);
      await this.spotifyService.addTracksToPlaylist(
        accessToken,
        playlist.id,
        trackUris
      );

      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        tracks: selectedTracks,
        external_urls: playlist.external_urls
      };
    } catch (error) {
      console.error('Error generating playlist:', error);
      throw new Error('Failed to generate playlist');
    }
  }

  private calculateTargetFeatures(
    profileFeatures: MoodMusicProfile['audioFeatures'],
    confidence: number
  ): any {
    // Use confidence to determine how strict the targeting should be
    const strictness = Math.max(0.3, confidence);
    
    return {
      energy: this.getTargetValue(profileFeatures.energy, strictness),
      valence: this.getTargetValue(profileFeatures.valence, strictness),
      danceability: this.getTargetValue(profileFeatures.danceability, strictness),
      tempo: this.getTargetValue(profileFeatures.tempo, strictness)
    };
  }

  private getTargetValue(range: { min: number; max: number }, strictness: number): number {
    const midpoint = (range.min + range.max) / 2;
    const variance = (range.max - range.min) * (1 - strictness) * 0.5;
    return Math.max(range.min, Math.min(range.max, 
      midpoint + (Math.random() - 0.5) * variance * 2
    ));
  }

  private async filterAndSelectTracks(
    tracks: SpotifyTrack[],
    targetFeatures: any,
    accessToken: string,
    targetCount: number
  ): Promise<SpotifyTrack[]> {
    if (tracks.length === 0) {
      throw new Error('No tracks found for the given mood');
    }

    // Get audio features for all tracks
    const trackIds = tracks.map(track => track.id);
    const audioFeatures = await this.spotifyService.getAudioFeatures(accessToken, trackIds);

    // Score tracks based on how well they match target features
    const scoredTracks = tracks.map((track, index) => {
      const features = audioFeatures[index];
      if (!features) return { track, score: 0 };

      const score = this.calculateTrackScore(features, targetFeatures);
      return { track, score };
    });

    // Sort by score and take the best tracks
    const selectedTracks = scoredTracks
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .map(item => item.track);

    // Shuffle to add some variety
    return this.shuffleArray(selectedTracks);
  }

  private calculateTrackScore(actualFeatures: any, targetFeatures: any): number {
    const weights = {
      energy: 0.3,
      valence: 0.3,
      danceability: 0.2,
      tempo: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [feature, weight] of Object.entries(weights)) {
      if (actualFeatures[feature] !== undefined && targetFeatures[feature] !== undefined) {
        let score = 0;
        
        if (feature === 'tempo') {
          // For tempo, use percentage difference
          const diff = Math.abs(actualFeatures[feature] - targetFeatures[feature]);
          const percentDiff = diff / targetFeatures[feature];
          score = Math.max(0, 1 - percentDiff);
        } else {
          // For other features (0-1 scale), use absolute difference
          const diff = Math.abs(actualFeatures[feature] - targetFeatures[feature]);
          score = Math.max(0, 1 - diff);
        }
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private generatePlaylistName(moodAnalysis: MoodAnalysis): string {
    const moodNames = {
      happy: ['Sunshine Vibes', 'Feel Good Hits', 'Happy Hour', 'Positivity Playlist', 'Joyful Jams'],
      sad: ['Melancholy Moments', 'Rainy Day Blues', 'Heartbreak Hotel', 'Emotional Journey', 'Tears & Tunes'],
      energetic: ['Power Hour', 'Adrenaline Rush', 'High Energy Hits', 'Pump It Up', 'Electric Vibes'],
      calm: ['Peaceful Moments', 'Zen Zone', 'Tranquil Tunes', 'Meditation Music', 'Serenity Sounds'],
      anxious: ['Restless Mind', 'Anxious Energy', 'Introspective Indie', 'Uncertain Times', 'Tension & Release'],
      nostalgic: ['Memory Lane', 'Throwback Therapy', 'Vintage Vibes', 'Golden Oldies', 'Nostalgic Notes']
    };

    const names = moodNames[moodAnalysis.primaryEmotion as keyof typeof moodNames] || ['Mixed Mood Music'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    return `${randomName} - ${new Date().toLocaleDateString()}`;
  }

  private generatePlaylistDescription(moodAnalysis: MoodAnalysis): string {
    const baseDescription = `Generated based on your mood: "${moodAnalysis.rawText.substring(0, 100)}${moodAnalysis.rawText.length > 100 ? '...' : ''}"`;
    
    const moodDescriptions = {
      happy: 'Uplifting tracks to keep your spirits high and energy positive.',
      sad: 'Contemplative songs that understand and embrace your current emotional state.',
      energetic: 'High-energy tracks to fuel your motivation and drive.',
      calm: 'Soothing melodies to help you relax and find inner peace.',
      anxious: 'Music that acknowledges restlessness while providing comfort.',
      nostalgic: 'Songs that capture the bittersweet beauty of memories and past times.'
    };

    const moodDesc = moodDescriptions[moodAnalysis.primaryEmotion as keyof typeof moodDescriptions] || 'Curated tracks to match your current mood.';
    
    return `${baseDescription}\n\n${moodDesc}\n\nConfidence: ${Math.round(moodAnalysis.confidence * 100)}%`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Alternative method for mood-based search queries
  async searchByMoodKeywords(
    moodAnalysis: MoodAnalysis,
    accessToken: string
  ): Promise<SpotifyTrack[]> {
    const profile = this.moodProfiles[moodAnalysis.primaryEmotion];
    if (!profile) return [];

    const searchQueries = [
      ...profile.keywords,
      ...profile.genres,
      moodAnalysis.primaryEmotion
    ];

    const allTracks: SpotifyTrack[] = [];

    for (const query of searchQueries.slice(0, 5)) { // Limit API calls
      try {
        const tracks = await this.spotifyService.searchTracks(
          accessToken,
          `genre:${query} OR ${query}`,
          10
        );
        allTracks.push(...tracks);
      } catch (error) {
        console.warn(`Search failed for query: ${query}`, error);
      }
    }

    // Remove duplicates
    const uniqueTracks = allTracks.filter((track, index, self) =>
      index === self.findIndex(t => t.id === track.id)
    );

    return uniqueTracks.slice(0, 30); // Return max 30 tracks
  }
}