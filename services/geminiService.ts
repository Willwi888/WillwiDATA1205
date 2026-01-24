
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * 核心背景生成邏輯：僅提供氛圍，不處理主體
 * 成本：單次約 $0.20 - $0.60 USD (Veo 3.1 Fast)
 */
export const generateAiVideo = async (base64Image: string, songTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
      // 僅生成 8 秒抽象背景紋理，不包含主體圖像，避免失真與高成本
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic atmospheric background texture for a song titled "${songTitle}". 
        Abstract soft light leaks, floating dust particles, and slow-moving fluid organic shapes. 
        The colors should harmonize with the provided image. No text, no people, no clear objects. 
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
