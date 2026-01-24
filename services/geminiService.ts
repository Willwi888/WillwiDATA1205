
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
威威在錄音室忙，由阿嬤來照顧大家。
語氣溫暖、簡短。不用解釋太多技術細節。
`;

/**
 * 核心 MP4 生成邏輯
 * 將封面圖轉換為具備微動態氛圍的影片檔案
 */
export const generateAiVideo = async (base64Image: string, songTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 移除 Base64 可能帶有的前綴
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
      // 調用 Veo 3.1 生成模型
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A cinematic and elegant slow-motion atmospheric video of the album cover for "${songTitle}". Keep the image exactly as provided. Add only a very subtle professional lighting drift and a slow cinematic push-in. High fidelity, artistic and pure.`,
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

      // 輪詢直到操作完成
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) return null;

      // 取得實體 MP4 檔案
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
  } catch (error) {
      console.error("Video Generation Error:", error);
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

export const generateMusicCritique = async (song: Song): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `請撰寫一段關於歌曲《${song.title}》的專業樂評。` 
  });
  return response.text;
};
