
import { GoogleGenAI, Type } from "@google/genai";
import { Song, Language, ProjectType } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * AI 解析功能：將亂序文字（如複製自 YouTube Music）轉換為歌曲對象
 */
export const parseWillwiTextCatalog = async (rawText: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位音樂資料管理專家。以下是從 YouTube Music 或數位發行後台複製出來的原始文字，其中包含約 200 首以上的歌曲資訊。
      請幫我解析出每一首歌的：
      1. title (歌名)
      2. releaseDate (格式 YYYY-MM-DD)
      3. youtubeUrl (播放連結)
      4. albumName (所屬專輯)
      5. upc (如有)
      
      原始文字如下：
      ${rawText}
      
      請以純 JSON 陣列格式回傳，不要有任何 Markdown 標籤。`,
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

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error) {
    console.error("AI Parse Error:", error);
    return [];
  }
};

export const discoverWillwiCatalog = async (): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請搜尋並列出獨立音樂人 "Willwi" 在 YouTube Music 上所有已發佈的專輯與單曲。
      我需要包含：歌曲標題、所屬專輯名稱 (如果有)、發行日期、YouTube 播放網址。
      請以 JSON 陣列格式回傳。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              albumName: { type: Type.STRING },
              releaseDate: { type: Type.STRING },
              youtubeUrl: { type: Type.STRING },
              upc: { type: Type.STRING }
            },
            required: ["title", "youtubeUrl"]
          }
        }
      },
    });

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error) {
    console.error("YouTube Discovery Error:", error);
    return [];
  }
};

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
    return null;
  } catch (error) {
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

export const generateAiVideo = async (imageB64: string, songTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageB64.includes(',') ? imageB64.split(',')[1] : imageB64;
  const mimeType = imageB64.match(/data:(.*?);base64/)?.[1] || 'image/png';

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A cinematic, abstract atmosphere for a music video titled "${songTitle}". 8 seconds, ambient light, slow motion.`,
      image: {
        imageBytes: base64Data,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      return `${downloadLink}&key=${process.env.API_KEY}`;
    }
    return null;
  } catch (error: any) {
    console.error("Veo Video Generation Error:", error);
    return null;
  }
};
