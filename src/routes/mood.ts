import { Router, Request, Response } from 'express';
import { MoodService } from '../services/moodService';
import { MoodRequest, ApiResponse, MoodAnalysis } from '../types';

const router = Router();
const moodService = new MoodService();

// POST /api/mood/analyze
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text }: MoodRequest = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text input is required and must be a string'
      } as ApiResponse<null>);
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text input cannot be empty'
      } as ApiResponse<null>);
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Text input must be less than 500 characters'
      } as ApiResponse<null>);
    }

    // Analyze mood
    const moodAnalysis = await moodService.analyzeMood(text.trim());

    res.json({
      success: true,
      data: moodAnalysis,
      message: 'Mood analysis completed successfully'
    } as ApiResponse<MoodAnalysis>);

  } catch (error) {
    console.error('Error in mood analysis endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze mood',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ApiResponse<null>);
  }
});

// GET /api/mood/test
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Mood analysis service is running',
    timestamp: new Date().toISOString(),
    availableEmotions: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'nostalgic']
  });
});

export default router;