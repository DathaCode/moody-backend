import OpenAI from 'openai';
import { MoodAnalysis } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class MoodService {
  async analyzeMood(text: string): Promise<MoodAnalysis> {
    try {
      const prompt = `
        Analyze the emotional content of the following text and return a JSON response with mood analysis.
        
        Text: "${text}"
        
        Please respond with ONLY a valid JSON object in this exact format:
        {
          "primaryEmotion": "one of: happy, sad, energetic, calm, anxious, nostalgic",
          "emotions": {
            "happy": 0.0-1.0,
            "sad": 0.0-1.0,
            "energetic": 0.0-1.0,
            "calm": 0.0-1.0,
            "anxious": 0.0-1.0,
            "nostalgic": 0.0-1.0
          },
          "confidence": 0.0-1.0
        }
        
        Rules:
        - All emotion scores should sum to approximately 1.0
        - primaryEmotion should be the highest scoring emotion
        - confidence represents how clear the emotional signal is (0.1-1.0)
        - Consider context, word choice, and overall sentiment
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert emotion analysis AI. Respond only with valid JSON objects for mood analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const moodData = JSON.parse(content);
      
      // Validate the response structure
      this.validateMoodAnalysis(moodData);

      return {
        ...moodData,
        rawText: text
      };
    } catch (error) {
      console.error('Error analyzing mood:', error);
      
      // Fallback mood analysis
      return this.getFallbackMoodAnalysis(text);
    }
  }

  private validateMoodAnalysis(data: any): void {
    const requiredEmotions = ['happy', 'sad', 'energetic', 'calm', 'anxious', 'nostalgic'];
    
    if (!data.primaryEmotion || !requiredEmotions.includes(data.primaryEmotion)) {
      throw new Error('Invalid primaryEmotion');
    }
    
    if (!data.emotions || typeof data.emotions !== 'object') {
      throw new Error('Invalid emotions object');
    }
    
    for (const emotion of requiredEmotions) {
      if (typeof data.emotions[emotion] !== 'number' || 
          data.emotions[emotion] < 0 || 
          data.emotions[emotion] > 1) {
        throw new Error(`Invalid emotion score for ${emotion}`);
      }
    }
    
    if (typeof data.confidence !== 'number' || 
        data.confidence < 0 || 
        data.confidence > 1) {
      throw new Error('Invalid confidence score');
    }
  }

  private getFallbackMoodAnalysis(text: string): MoodAnalysis {
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based fallback analysis
    const happyWords = ['happy', 'joy', 'excited', 'great', 'awesome', 'love', 'wonderful'];
    const sadWords = ['sad', 'down', 'depressed', 'upset', 'hurt', 'cry', 'lonely'];
    const energeticWords = ['energetic', 'pump', 'dance', 'party', 'active', 'workout'];
    const calmWords = ['calm', 'peaceful', 'relax', 'quiet', 'meditate', 'serene'];
    const anxiousWords = ['anxious', 'worried', 'stress', 'nervous', 'panic', 'fear'];
    const nostalgicWords = ['remember', 'past', 'nostalgic', 'memories', 'old', 'miss'];

    const scores = {
      happy: this.countKeywords(lowerText, happyWords) / happyWords.length,
      sad: this.countKeywords(lowerText, sadWords) / sadWords.length,
      energetic: this.countKeywords(lowerText, energeticWords) / energeticWords.length,
      calm: this.countKeywords(lowerText, calmWords) / calmWords.length,
      anxious: this.countKeywords(lowerText, anxiousWords) / anxiousWords.length,
      nostalgic: this.countKeywords(lowerText, nostalgicWords) / nostalgicWords.length,
    };

    // Normalize scores
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(scores).forEach(key => {
        scores[key as keyof typeof scores] = scores[key as keyof typeof scores] / total;
      });
    } else {
      // Default to calm if no keywords matched
      scores.calm = 1.0;
    }

    const primaryEmotion = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
    )[0];

    return {
      primaryEmotion,
      emotions: scores,
      confidence: total > 0 ? Math.min(total, 0.8) : 0.3,
      rawText: text
    };
  }

  private countKeywords(text: string, keywords: string[]): number {
    return keywords.filter(keyword => text.includes(keyword)).length;
  }
}