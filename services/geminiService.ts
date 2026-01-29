
import { GoogleGenAI, Type } from "@google/genai";
import { Song, Language, ProjectType, ReleaseCategory } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * 專為 YouTube Music / YouTube 頻道設計的深度解析器
 * 支援：發行內容 (Releases) 網格頁面、單一專輯播放清單頁面 (Playlist)
 */
export const discoverYoutubeReleases = async (url: string): Promise<Partial<Song>[]> => {
  // 過濾冗餘參數以提升搜尋成功率
  const cleanUrl = url.split('&si=')[0];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請使用 Google Search 工具瀏覽並解析此 YouTube Music 頁面內容：${cleanUrl}。
      
      場景解析說明：
      1. 如果這是一個「發行內容 (Releases)」分頁：請列出所有的專輯與單曲項目。
      2. 如果這是一個「播放清單 (Playlist/Album)」頁面：請將該播放清單視為一個專輯，並列出其中的所有曲目。
      
      提取要求：
      - 標題 (Title)
      - 作品種類 (Album/Single)
      - 描述 (如 "8 首歌" 或曲序資訊)
      - 該項目的 YouTube 播放或詳情連結
      
      請嚴格以 JSON 格式回傳陣列，若頁面內容很多（如 79+ 項目），請盡可能完整列出。
      格式範例：[{"title": "作品名", "releaseCategory": "Album", "description": "10 首歌", "youtubeUrl": "連結"}]`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              releaseCategory: { type: Type.STRING },
              description: { type: Type.STRING },
              youtubeUrl: { type: Type.STRING }
            },
            required: ["title", "youtubeUrl"]
          }
        }
      },
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("YouTube AI Releases Discovery Error:", error);
    throw error; // 丟出錯誤讓外部 UI 處理超時與重置
  }
};

/**
 * 利用 Gemini 3 Pro 配合 Google Search 工具解析 YouTube 網址
 */
export const discoverYoutubePlaylist = async (url: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請使用 Google Search 工具解析此 YouTube 網址：${url}。
      列出頁面中所有音樂作品的「名稱（標題）」與「連結」。
      請以 JSON 回傳：[{"title": "歌曲名", "youtubeUrl": "連結"}]。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

/**
 * 利用 Gemini 3 Pro 與 Google Search 搜尋 YouTube Music 官方連結
 */
export const searchYouTubeMusicLink = async (title: string, isrc: string = ''): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const query = `請搜尋歌曲「${title}」${isrc ? ` (ISRC: ${isrc})` : ''} 在 YouTube Music 上的官方播放連結。`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: query,
      config: { tools: [{ googleSearch: {} }] },
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.web && (chunk.web.uri.includes('music.youtube.com') || chunk.web.uri.includes('youtube.com/watch'))) {
          return chunk.web.uri;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const getChatResponse = async (
  message: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { systemInstruction: GRANDMA_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] },
    history: history
  });
  const result = await chat.sendMessage({ message });
  const text = result.text;
  const sources: { title: string; uri: string }[] = [];
  const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
      chunks.forEach((c: any) => { if (c.web) sources.push({ title: c.web.title, uri: c.web.uri }); });
  }
  return { text, sources };
};
