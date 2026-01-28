
import { GoogleGenAI, Type } from "@google/genai";
import { Song, Language, ProjectType, ReleaseCategory } from "../types";

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」。
語氣慢、暖，不用解釋技術。
`;

/**
 * 利用 Gemini 3 Pro 配合 Google Search 工具解析 YouTube 播放清單
 * 優點：無需 YouTube API Key，直接讀取網頁內容
 */
export const discoverYoutubePlaylist = async (playlistUrl: string): Promise<Partial<Song>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請使用 Google Search 工具「瀏覽」並解析這個 YouTube 播放清單網址：${playlistUrl}。
      這是一個音樂人的作品集。請列出該清單中所有的「影片標題（歌曲名稱）」。
      請忽略無關的資訊，並以 JSON 格式回傳一個陣列，每個物件包含 "title" 和 "youtubeUrl"。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { 
                type: Type.STRING,
                description: "歌曲或影片的標題"
              },
              youtubeUrl: {
                type: Type.STRING,
                description: "該影片的直接連結"
              }
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
 * 使用 Gemini 3 Pro 搜尋歌曲的 YouTube Music 官方連結
 */
export const searchYouTubeMusicLink = async (title: string, isrc: string = ''): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請幫我搜尋這首歌的 YouTube Music 官方連結：名稱「${title}」${isrc ? `，ISRC 為「${isrc}」` : ''}。
      回傳結果僅需包含該連結網址即可。`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const link = response.text?.trim() || null;
    if (link && (link.includes('youtube.com') || link.includes('youtu.be'))) {
      return link;
    }
    return null;
  } catch (error) {
    console.error("YouTube Music Search Error:", error);
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
