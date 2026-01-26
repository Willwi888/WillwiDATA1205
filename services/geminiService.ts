
import { GoogleGenAI, Type } from "@google/genai";
import { Song } from "../types";

// 移除所有阿嬤或 AI 的對話指令，僅保留數據解析功能
export const parseWillwiTextCatalog = async (rawText: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Parse track data: title, releaseDate, youtubeUrl, albumName, upc from raw text: ${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              releaseDate: { type: Type.STRING },
              youtubeUrl: { type: Type.STRING },
              albumName: { type: Type.STRING },
              upc: { type: Type.STRING }
            },
            required: ["title"]
          }
        }
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

/**
 * 核心任務：生成一個 8 秒鐘的有機顆粒/噪點背景循環。
 * 這是為了影片導出時的感官呼吸感，不干涉音樂表現。
 */
export const generateAiVideo = async (imageB64: string, songTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageB64.includes(',') ? imageB64.split(',')[1] : imageB64;
  const mimeType = imageB64.match(/data:(.*?);base64/)?.[1] || 'image/png';

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      // 極簡指令：生成 8 秒鐘的有機底片感顆粒與噪點循環背景
      prompt: `8-second seamless loop background. Cinematic organic film grain, monochrome noise floor, 
               minimalist atmospheric texture, high-fidelity analog particles. 
               No shapes, no characters, just pure rhythmic lighting and static textures.`,
      image: {
        imageBytes: base64Data,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p', // 保持效率與品質的平衡
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      return `${downloadLink}&key=${process.env.API_KEY}`;
    }
    return null;
  } catch (error: any) {
    console.error("VEO Loop Render Error:", error);
    return null;
  }
};

// 廢棄聊天功能，直接返回空字串，徹底降低 AI 干擾
export const getChatResponse = async (message: string): Promise<string> => {
  return "";
};
