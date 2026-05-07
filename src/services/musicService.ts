import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MusicSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  artist?: string;
}

export const MusicService = {
  async searchMusic(title: string, artist?: string, retries = 3): Promise<MusicSearchResult[]> {
    let lastError: any;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const query = `Find top 7 YouTube videos for the song "${title}" by ${artist || 'various artists'}.
        CRITICAL: Return ONLY an array of exactly 7 results.
        Include ONLY these fields: videoId, title, thumbnail.
        Ensure videoId is valid.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: query,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  videoId: { type: Type.STRING, description: "YouTube ID" },
                  title: { type: Type.STRING, description: "Video Title" },
                  thumbnail: { type: Type.STRING, description: "HQ Thumbnail URL" },
                },
                required: ["videoId", "title", "thumbnail"]
              }
            }
          }
        });

        const text = response.text;
        if (!text) return [];
        
        const results = JSON.parse(text) as MusicSearchResult[];
        
        return results.filter(r => r.videoId && r.videoId.length > 0).map(r => ({
          ...r,
          thumbnail: r.thumbnail || `https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`
        }));
      } catch (error: any) {
        lastError = error;
        const isUnavailable = error.message?.includes('503') || error.status === 503 || error.error?.code === 503;
        
        if (isUnavailable && i < retries) {
          console.warn(`Gemini 503 detected, retrying (${i + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          continue;
        }
        
        console.error('Music search failed:', error);
        break;
      }
    }
    return [];
  }
};
