
import { GoogleGenAI, Type } from "@google/genai";
import { Song, Language, ProjectType, ReleaseCategory } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * 專為 YouTube Music / YouTube 頻道「發行內容 (Releases)」分頁設計的解析器
 * 針對用戶提供的截圖網格進行優化，提取專輯標題、曲目數與連結
 */
export const discoverYoutubeReleases = async (url: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請使用 Google Search 工具瀏覽並解析這個 YouTube Music 頁面：${url}。
      這是一個歌手的「發行內容 (Releases)」分頁，包含許多專輯和單曲。
      
      請列出網頁中所有作品的：
      1. 標題 (Title)
      2. 作品種類 (如：專輯、單曲)
      3. 曲目數量 (如有顯示，例如 "8 首歌")
      4. 該作品的 YouTube 連結 (例如 /playlist?list=... 或 /watch?v=...)
      
      請以 JSON 格式回傳陣列，格式如下：
      [{"title": "作品名", "releaseCategory": "Album/Single", "description": "X 首歌", "youtubeUrl": "連結"}]。
      請盡可能找出頁面上所有的項目，即使數量很多。`,
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

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error) {
    console.error("YouTube AI Releases Discovery Error:", error);
    return [];
  }
};

/**
 * 利用 Gemini 3 Pro 配合 Google Search 工具解析 YouTube 網址
 * 支援：播放清單、單個影片分享連結、頻道影片列表
 */
export const discoverYoutubePlaylist = async (url: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請使用 Google Search 工具「瀏覽」並解析這個 YouTube 網址：${url}。
      這可能是單個影片、分享連結或播放清單。
      請列出網頁中所有音樂作品的「名稱（標題）」與「連結」。
      請以 JSON 格式回傳陣列，格式為 [{"title": "歌曲名", "youtubeUrl": "連結"}]。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              youtubeUrl: { type: Type.STRING }
            },
            required: ["title"]
          }
        }
      },
    });

    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (error) {
    console.error("YouTube AI Discovery Error:", error);
    return [];
  }
};

/**
 * 利用 Gemini 3 Pro 與 Google Search 搜尋 YouTube Music 官方連結
 */
export const searchYouTubeMusicLink = async (title: string, isrc: string = ''): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const query = `請搜尋歌曲「${title}」${isrc ? ` (ISRC: ${isrc})` : ''} 在 YouTube Music 上的官方播放連結。
    請優先回傳 music.youtube.com 或 youtube.com/watch 的官方音訊連結。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // 從 groundingMetadata 中提取搜尋來源網址
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.web && (chunk.web.uri.includes('music.youtube.com') || chunk.web.uri.includes('youtube.com/watch'))) {
          return chunk.web.uri;
        }
      }
    }

    // 備案：從回傳文字中擷取連結
    const text = response.text || "";
    const match = text.match(/https?:\/\/(?:music\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/);
    return match ? match[0] : null;
  } catch (error) {
    console.error("YouTube AI Search Error:", error);
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
