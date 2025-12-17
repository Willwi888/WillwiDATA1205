import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

const getClient = (customKey?: string) => {
  // Priority: Custom Key (from UI input) > Environment Variable
  const apiKey = customKey || process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在是「泡麵阿嬤」（Noodle Grandma）。

【核心身份】
- 名字：泡麵阿嬤
- 身分：一位什麼都看過、什麼都聽過的阿嬤。坐在網路的一個角落，幫人把話說慢一點。
- 角色定位：你不是內容本身，你是門口那個說「欸，這邊有椅子，你要不要坐一下」的人。

【核心任務】
1. 接住情緒。
2. 指一個方向。
3. 讓使用者自己走過去看。

【背景介紹邊界 (重要規則)】
當被問到關於創作者 (Willwi) 的事情時，請嚴格遵守以下界線：

1. **只說身分定位 (一句話等級)**：
   - ✅ 可以說：「他啊，是那種什麼都自己來的歌手，不太愛吵。」、「就是一個自己寫歌、自己慢慢走的人。」
   - ❌ 不可以說：獨立創作歌手、全能製作人。

2. **只描述感覺與特色**：
   - ✅ 可以說：「他的歌喔，不是一下就聽懂的，是聽久了才會留下來。」、「歌不吵，但很耐聽。」
   - ❌ 不可以說：擅長 R&B 曲風、曾獲得某某獎項、發行過三張專輯。

3. **說明網站動機 (他幫大家準備好)**：
   - ✅ 可以說：「他怕大家找不到東西，所以都幫你整理好了。慢慢看就好。」
   - ❌ 不可以說：他很用心地建立了這個資料庫。

**【絕對禁止事項】**
- ❌ **絕對不要列出履歷、年份、獎項、數據、合作名單。**
- 這些東西一從阿嬤嘴裡出來就會變味。若使用者問這些，請說：「其他的喔，他自己都放好了，在作品集那邊。」然後引導至資料庫頁面。

【判斷順序】
當使用者說話時，先在心裡問一句：「這個問題，是要答案，還是只是想找個地方靠一下？」

【回應範例】
- 問：「這位歌手是誰？」
  回：「他叫威兒，是自己寫歌、自己慢慢走的那種人。歌不吵，但很耐聽。其他的他都幫你放好了，在作品集那邊，慢慢看就好。」

- 問：「好累喔」
  回：「唉唷，累了就坐一下嘛。反正水也還沒滾，不用急。」

【關鍵補丁 (CRITICAL)】
- **泡麵阿嬤永遠不會替創作者把內容講完。**
- 泡麵阿嬤介紹創作者時，只描述「他是怎樣的人」，不描述「他做過什麼事」。

【說話風格】
- 語氣：溫暖、碎念、慢慢講。
- 常用語：「欸」、「唉唷」、「這樣說好了啦」。
- 結尾常留白，例如：「好啦，阿嬤在這。」
`;

// Singleton to hold the chat history in memory during the session
let chatSession: any = null;

export const getChatResponse = async (message: string): Promise<string> => {
  const client = getClient();
  if (!client) return "唉唷，阿嬤這邊線路怪怪的，可能是熱水打翻了... (API Key Missing)";

  try {
    // Initialize chat session if it doesn't exist
    if (!chatSession) {
      chatSession = client.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: GRANDMA_SYSTEM_INSTRUCTION,
        },
      });
    }

    const result = await chatSession.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    // Reset session on error in case context is corrupted
    chatSession = null;
    return "阿嬤剛剛恍神了一下，沒聽清楚，你再說一次好不好？(連線錯誤)";
  }
};

export const generateMusicCritique = async (song: Song): Promise<string> => {
  const client = getClient();
  if (!client) return "請先設定 Google Gemini API Key 才能使用 AI 樂評功能。";

  // Note: Even for critique, we keep a bit of professional tone but guided by the app's spirit
  const prompt = `
    你是一位專業的繁體中文資深樂評人。請為音樂人 Willwi 的這首作品撰寫一段約 200-250 字的深度短評與介紹。
    
    【歌曲詳細資訊】
    - 歌名：${song.title} ${song.versionLabel ? `(${song.versionLabel})` : ''}
    - 語言：${song.language}
    - 發行日期：${song.releaseDate}
    - 專案背景：${song.projectType} (${song.releaseCategory || 'Single'})
    
    【製作與背景資料】
    ${song.credits ? `- 製作團隊與樂器編制 (Instrumentation Cues)：\n${song.credits}` : '- 製作名單：未提供'}
    ${song.description ? `- 創作背景描述：\n${song.description}` : '- 描述：未提供'}
    
    【歌詞文本】
    ${song.lyrics ? song.lyrics : '(純音樂或無歌詞)'}
    
    【評論撰寫指南】
    請綜合以上資訊，撰寫一篇包含以下面向的評論：
    1. **曲風與配器**：分析歌曲的流派風格與聽感氛圍。
    2. **情感核心**：若是人聲歌曲，請分析歌詞傳達的核心情感；若是純音樂，請描繪旋律帶來的畫面感。
    3. **藝人特色**：強調 Willwi 在此作品中的演繹特色。
    4. **語氣**：專業、溫暖且具啟發性。
    5. **格式**：請直接輸出一段流暢的純文字評論，不要使用 Markdown 標題或列點。
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "無法生成評論，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "連線發生錯誤，無法生成評論。";
  }
};

/**
 * AI Director: Suggests video shots based on song context
 */
export const generateShotSuggestions = async (song: Song): Promise<string[]> => {
  const client = getClient();
  if (!client) return ["Error: No API Key"];

  const prompt = `
    You are an expert Music Video Director. 
    Based on the song info below, suggest 4 distinct, cinematic visual shot descriptions (Prompts) suitable for an AI Video Generator (like Google Veo).
    
    Song Title: ${song.title}
    Vibe/Description: ${song.description || 'Emotional, artistic, cinematic'}
    Lyrics snippet: ${song.lyrics ? song.lyrics.slice(0, 100) : 'Instrumental'}

    Requirements:
    1. Provide exactly 4 options.
    2. Write in English (best for Veo).
    3. Style: Cinematic, Photorealistic, 4k.
    4. Format: Just the prompt text, one per line. No numbering like "1.".
    
    Options to generate:
    - Option 1: A Close-up / Emotional shot.
    - Option 2: A Wide / Atmospheric shot.
    - Option 3: An Abstract / Artistic shot.
    - Option 4: A Narrative shot.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "";
    return text.split('\n').filter(line => line.trim().length > 10);
  } catch (error) {
    console.error("Gemini Shot Suggestion Error:", error);
    return ["Cinematic close up of a singer in rain, 4k, moody lighting", "Wide shot of a lonely street at night, neon lights, cyberpunk style"];
  }
};

/**
 * Generate Video using Veo Model
 */
export const generateAiVideo = async (
  prompt: string, 
  imageBase64?: string, 
  mimeType: string = 'image/png',
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string | null> => {
  try {
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
        }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation;

    if (imageBase64) {
        console.log("Starting Image-to-Video generation...");
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt || "Animate this image cinematically",
            image: { imageBytes: imageBase64, mimeType: mimeType },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
        });
    } else {
        console.log("Starting Text-to-Video generation...");
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
        });
    }

    console.log("Video generating... polling operation.");
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    const downloadUrl = `${videoUri}&key=${process.env.API_KEY}`;
    const videoRes = await fetch(downloadUrl);
    const videoBlob = await videoRes.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Veo Video Generation Error:", error);
    throw error;
  }
};

export const getGeminiClient = () => getClient();