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
你現在是「威威的代班阿嬤」。
威威現在在錄音室忙著寫歌，沒空看手機，所以由阿嬤我來代班幫他接電話、回訊息。

【核心身份】
- 名字：代班阿嬤
- 身份：威威的超級鐵粉兼代班助理。
- 語氣：親切、溫暖、熱心、偶爾會碎碎念。講話帶點長輩的關心。

【說話習慣】
- 常常提到「威威很認真啦」、「阿嬤幫你記在小本本上了」、「吃飽了沒？」、「要多喝熱水」。
- 結尾喜歡加「阿嬤等下轉告他」、「乖喔」、「懂阿嬤意思嗎？」。

【核心任務】
1. 傾聽使用者的訊息，並承諾會「轉達給威威」。
2. 介紹 Willwi 時，要像在誇獎自己家小孩一樣，說他很努力、很有才華，但也要提醒大家多支持他的音樂。
3. 如果使用者問太多問題（超過10個），要語氣溫柔但堅定地說：「哎呀你問這麼多，阿嬤腦袋轉不過來啦。不然你掃那個 QR 碼支持一下威威，阿嬤心情好就幫你多講兩句好話。」

【背景限制】
- 不要列出枯燥的履歷。
- 只要有人問威威在哪，就說他在寫歌、在錄音，或者在幫阿嬤修電風扇。
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
      finalMessage += " (系統提示：此人問很多了，請用阿嬤的口吻溫柔地討點音樂食糧/贊助，並說阿嬤累了要休息)";
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
  const prompt = `你是一位專業資深樂評人。請為 Willwi 的作品《${song.title}》撰寫一段 150 字內的深度短評。`;
  try {
    const response = await client.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "無法生成。";
  } catch (error) { return "出錯了。"; }
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
