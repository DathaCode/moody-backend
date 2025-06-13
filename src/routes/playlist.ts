import { Router, Request, Response } from 'express';
import { PlaylistService } from '../services/playlistService';
import { ApiResponse, PlaylistRequest, GeneratedPlaylist, MoodAnalysis } from '../types';

const router = Router();
const playlistService = new PlaylistService();

// POST /api/playlist/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { moodAnalysis, userId } = req.body as PlaylistRequest;
    
    // Get access token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required'
      } as ApiResponse<null>);
    }

    const accessToken = authHeader.substring(7);

    // Validation
    if (!moodAnalysis) {
      return res.status(400).json({
        success: false,
        error: 'Mood analysis data is required'
      } as ApiResponse<null>);
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      } as ApiResponse<null>);
    }

    // Validate mood analysis structure
    if (!moodAnalysis.primaryEmotion || !moodAnalysis.emotions || !moodAnalysis.rawText) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mood analysis data structure'
      } as ApiResponse<null>);
    }

    // Generate playlist
    const playlist = await playlistService.generatePlaylist(
      moodAnalysis,
      accessToken,
      userId
    );

    res.json({
      success: true,
      data: playlist,
      message: 'Playlist generated and created successfully'
    } as ApiResponse<GeneratedPlaylist>);

  } catch (error) {
    console.error('Error generating playlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate playlist',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ApiResponse<null>);
  }
});

// POST /api/playlist/preview
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { moodAnalysis } = req.body;
    
    // Get access token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required'
      } as ApiResponse<null>);
    }

    const accessToken = authHeader.substring(7);

    // Validation
    if (!moodAnalysis) {
      return res.status(400).json({
        success: false,
        error: 'Mood analysis data is required'
      } as ApiResponse<null>);
    }

    // Get track suggestions without creating playlist
    const tracks = await playlistService.searchByMoodKeywords(
      moodAnalysis as MoodAnalysis,
      accessToken
    );

    res.json({
      success: true,
      data: {
        tracks: tracks.slice(0, 15), // Limit to 15 tracks for preview
        mood: moodAnalysis.primaryEmotion,
        confidence: moodAnalysis.confidence
      },
      message: 'Playlist preview generated successfully'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error generating playlist preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate playlist preview',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ApiResponse<null>);
  }
});

// GET /api/playlist/test
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Playlist generation service is running',
    timestamp: new Date().toISOString(),
    supportedMoods: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'nostalgic']
  });
});

export default router;