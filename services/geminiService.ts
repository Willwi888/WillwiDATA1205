
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * 搜尋官方 YouTube Music 連結
 */
export const searchYouTubeMusicLink = async (title: string, isrc: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請尋找歌曲 "${title}" (ISRC: ${isrc}) 在 YouTube Music 上的官方播放連結。
      請直接回傳該網址，不要有其他文字。`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const urlMatch = text.match(/https?:\/\/(music\.)?youtube\.com\/(watch\?v=|browse\/|playlist\?list=)[a-zA-Z0-9_-]+/);
    
    if (urlMatch) return urlMatch[0];

    // 從 Grounding Chunks 尋找
    const chunk = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.find(c => 
      c.web?.uri?.includes('youtube.com') || c.web?.uri?.includes('music.youtube.com')
    );
    
    return chunk?.web?.uri || null;
  } catch (error) {
    console.error("YouTube Music Search Error:", error);
    return null;
  }
};

/**
 * 核心背景生成邏輯
 */
export const generateAiVideo = async (base64Image: string, songTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic atmospheric background texture for a song titled "${songTitle}". 
        Abstract soft light leaks, floating dust particles, and slow-moving fluid organic shapes. 
        Smooth loopable feel. 1080p high quality.`,
        image: {
          imageBytes: cleanBase64,
          mimeType: 'image/png', 
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      let attempts = 0;
      while (!operation.done && attempts < 40) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        if (operation.error) throw new Error(operation.error.message);
        attempts++;
      }

      if (!operation.done) return null;

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) return null;

      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
  } catch (error) {
      console.error("AI Background Generation Error:", error);
      return null;
  }
};

export const getChatResponse = async (message: string, messageCount: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction: GRANDMA_SYSTEM_INSTRUCTION },
  });
  const result = await chat.sendMessage({ message });
  return result.text;
};
