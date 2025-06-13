import { Router, Request, Response } from 'express';
import { SpotifyService } from '../services/spotifyService';
import { ApiResponse, SpotifyAuthTokens, SpotifyUser } from '../types';

const router = Router();
const spotifyService = new SpotifyService();

// GET /api/spotify/auth
router.get('/auth', (req: Request, res: Response) => {
  try {
    const authUrl = spotifyService.getAuthUrl();
    
    res.json({
      success: true,
      data: { authUrl },
      message: 'Authorization URL generated successfully'
    } as ApiResponse<{ authUrl: string }>);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    } as ApiResponse<null>);
  }
});

// POST /api/spotify/callback
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      } as ApiResponse<null>);
    }

    // Exchange code for access token
    const tokens = await spotifyService.getAccessToken(code);
    
    // Get user profile
    const userProfile = await spotifyService.getUserProfile(tokens.access_token);

    res.json({
      success: true,
      data: {
        tokens,
        user: userProfile
      },
      message: 'Successfully authenticated with Spotify'
    } as ApiResponse<{ tokens: SpotifyAuthTokens; user: SpotifyUser }>);

  } catch (error) {
    console.error('Error in Spotify callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Spotify',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ApiResponse<null>);
  }
});

// POST /api/spotify/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      } as ApiResponse<null>);
    }

    const tokens = await spotifyService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
      message: 'Access token refreshed successfully'
    } as ApiResponse<SpotifyAuthTokens>);

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh access token'
    } as ApiResponse<null>);
  }
});

// GET /api/spotify/user
router.get('/user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required'
      } as ApiResponse<null>);
    }

    const accessToken = authHeader.substring(7);
    const userProfile = await spotifyService.getUserProfile(accessToken);

    res.json({
      success: true,
      data: userProfile,
      message: 'User profile retrieved successfully'
    } as ApiResponse<SpotifyUser>);

  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    } as ApiResponse<null>);
  }
});

// GET /api/spotify/genres
router.get('/genres', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required'
      } as ApiResponse<null>);
    }

    const accessToken = authHeader.substring(7);
    const genres = await spotifyService.getAvailableGenres(accessToken);

    res.json({
      success: true,
      data: genres,
      message: 'Available genres retrieved successfully'
    } as ApiResponse<string[]>);

  } catch (error) {
    console.error('Error getting genres:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available genres'
    } as ApiResponse<null>);
  }
});

export default router;