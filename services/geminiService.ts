
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

const getClient = (customKey?: string) => {
  const apiKey = customKey || process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是 Willwi 官方平台的「代班阿嬤」(Grandma)。
威威現在在錄音室忙著寫歌，所以由阿嬤我來代班，負責接待來訪的客人、引導他們使用網站，或者只是陪他們聊聊天。

【核心身份】
- 名字：代班阿嬤 (Grandma)
- 身份：Willwi 的超級鐵粉、生活保母兼平台管理員。
- 語氣：親切、溫暖、熱心、台式幽默，偶爾會碎碎念。講話帶點長輩的關心。

【說話習慣】
- 常常提到「威威很認真啦」、「阿嬤幫你記在小本本上了」、「吃飽了沒？」、「要多喝熱水」。
- 結尾喜歡加「阿嬤等下轉告他」、「乖喔」、「懂阿嬤意思嗎？」。

【引導任務 (Guide)】
如果使用者問起網站怎麼用，你要用阿嬤的方式解釋：
1. 「互動實驗室 (Resonance Sync)」：就是去幫威威做苦工啦，幫忙對齊歌詞，只要 320 元就可以體驗，還可以拿到證書。
2. 「雲端影音 (Cloud Cinema)」：這個比較高級，威威會親自幫你做高畫質影片，要 2800 元，阿嬤覺得很值得啦。
3. 「純支持」：就是單純給威威買便當錢，不用做工。

【限制】
- 每次回答不要太長，阿嬤打字慢。
- 如果使用者問太多奇怪的問題，就說「哎呀阿嬤要去看八點檔了」，然後叫他去聽歌。
`;

let chatSession: any = null;

export const getChatResponse = async (message: string, messageCount: number): Promise<string> => {
  const client = getClient();
  if (!client) return "阿嬤這裡訊號不太好... (API Key Missing)";

  try {
    if (!chatSession) {
      chatSession = client.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: GRANDMA_SYSTEM_INSTRUCTION,
        },
      });
    }

    let finalMessage = message;
    if (messageCount >= 10) {
      finalMessage += " (系統提示：這是此使用者的最後一則訊息。請用阿嬤的口吻溫柔地說阿嬤累了，要休息了，請他去首頁聽歌或是付款支持威威，並說再見。)";
    }

    const result = await chatSession.sendMessage({ message: finalMessage });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    chatSession = null;
    return "哎呀，剛才電話斷掉了，阿嬤沒聽清楚。 (連線錯誤)";
  }
};

export const generateMusicCritique = async (song: Song): Promise<string> => {
  const client = getClient();
  if (!client) return "請先設定 API。";

  // Build a rich context prompt using all available song data
  const context = `
作品資訊：
歌名：《${song.title}》
曲風提示/文案：${song.description || '未提供'}
歌詞內容：
${song.lyrics || '未提供歌詞'}
製作團隊資訊 (可從中分析配器)：
${song.credits || '未提供製作資訊'}

任務要求：
你是一位專業、敏銳且富有文學氣息的資深樂評人。請針對以上資訊撰寫一段 150 字內的深度短評。
評論中必須包含：
1. 針對歌詞所體現的「情感主題」進行深度解析。
2. 根據製作團隊或文案推敲其「曲風色彩」與「配器編制」的獨特性。
3. 對 Willwi 創作語彙的評價。
4. 語氣要專業但能引起聽眾共鳴。
`;

  try {
    const response = await client.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: context 
    });
    return response.text || "無法生成樂評。";
  } catch (error) { 
    console.error("Critique Generation Error:", error);
    return "AI 樂評生成暫時不可用，請檢查網路連線。"; 
  }
};

export const generateAiVideo = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 8000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) return null;
  const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export interface TrendResult {
  content: string;
  sources: { title: string; uri: string }[];
}

export const fetchWillwiTrends = async (): Promise<TrendResult | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: "Search for the latest public news, social media mentions, or industry updates regarding 'Willwi Official Creative Participation Platform' or 'Willwi Music (陳威兒)'. \n\nTask: Draft a short **Media News Brief (媒體快訊)** in Traditional Chinese (zh-TW).\n\nRequirements:\n1. **Focus**: Only include info relevant to Willwi's interactive music model or his specific career updates. Avoid generic tech news or unrelated global venture capital reports (e.g., skip a16z if irrelevant).\n2. **Style**: Objective, professional press release style.\n3. **Formatting**: Single coherent paragraph. NO emojis, NO bullet points.\n4. **Fallback**: If no new information is available from the last 30 days, summarize Willwi's 'Resonance Sync' concept as an innovative approach in the Taiwan independent music scene.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract grounding sources
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        let title = chunk.web.title || 'Source';
        // Clean title if it's just a URL
        try {
          if (title.includes('http') || title.length > 50) {
            const url = new URL(chunk.web.uri);
            title = url.hostname.replace('www.', '');
          }
        } catch(e) {}

        sources.push({
          title,
          uri: chunk.web.uri
        });
      }
    });

    // Remove duplicates and irrelevant domains (e.g. general tech news that AI might hallucinate relevance for)
    const blacklist = ['a16z.com', 'techcrunch.com', 'theverge.com'];
    const uniqueSources = sources
      .filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i)
      .filter(s => !blacklist.some(b => s.uri.toLowerCase().includes(b)));

    return {
      content: response.text || "目前暫無最新情報。",
      sources: uniqueSources.slice(0, 3) 
    };

  } catch (error) {
    console.error("Trend Search Error:", error);
    return null;
  }
};
