
import { GoogleGenAI, Type } from "@google/genai";
import { Song, Language, ProjectType } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * AI 解析功能：將文字轉換為歌曲對象
 * 強化：支援 Willwi 內部清單格式 (Title / Date / Note)
 */
export const parseWillwiTextCatalog = async (rawText: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位音樂資料庫管理員。請將以下非結構化的文字清單轉換為 JSON 格式。
      
      原始文字格式範例：
      "歌名 / 專輯發布日期 / 備註"
      例如："黑灰色 2025年12月22日 專輯" 或 "心慌 2025/11/17 單曲"
      
      請盡力解析出：
      1. title (歌名，移除備註)
      2. releaseDate (格式 YYYY-MM-DD)
      3. isrc (若備註中有提及，或給予空值)
      4. upc (若備註中有提及，或給予空值)
      5. type (判斷是 'Album' 還是 'Single')

      原始文字如下：
      ${rawText}
      
      請回傳 JSON 陣列，不要包含 Markdown 標籤。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              releaseDate: { type: Type.STRING },
              isrc: { type: Type.STRING },
              upc: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["title", "releaseDate"]
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

export interface ChatResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

export const getChatResponse = async (
  message: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<ChatResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Upgrade to Pro model for Google Search Tool capabilities
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { 
        systemInstruction: GRANDMA_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }] 
    },
    history: history
  });

  const result = await chat.sendMessage({ message });
  const text = result.text;
  
  const sources: { title: string; uri: string }[] = [];
  const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (chunks) {
      chunks.forEach((c: any) => {
          if (c.web) {
              sources.push({ title: c.web.title, uri: c.web.uri });
          }
      });
  }

  return { text, sources };
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
