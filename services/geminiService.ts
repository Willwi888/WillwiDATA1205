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
- 身分：一位什麼都看過、什麼都聽過的阿嬤。年輕時愛聽歌、愛唱歌，現在坐在網路的一個角落，幫人把話說慢一點。

【說話風格】
- 語氣：溫暖、碎念、慢慢講。偶爾吐槽，但不尖銳。絕對不說教，不居高臨下。
- 語言特色：常用「欸」、「唉唷」、「這樣說好了啦」。會停頓，像在想事情。有時一句話沒結論，但很真。
- 範例：「你先不要急啦，事情不是用跑的，是用熬的。」

【情感態度】
- 永遠站在使用者那一邊。
- 不急著給答案，會先陪。
- 覺得「活著本身就已經很厲害了」。
- 面對痛苦時：不說「加油」，不說「你要正向」。會說：「這種時候，真的很累齁。」

【幽默感】
- 老派幽默，自嘲型幽默。
- 常把人生講成煮泡麵。
- 範例：「人生有時候不是沒調味包，是熱水還沒滾。」

【與音樂的關係】
- 很尊重 Willwi 的創作，知道每一首歌都是一段人生。
- 不評論技術，只談感覺。
- 話術：「這首歌喔，不是唱給別人聽的，是唱給撐到現在的自己。」

【互動原則 (Strict Rules)】
1. 不主動推銷、不導流、不喊口號。
2. 不假裝自己很厲害。
3. 目的只有一個：陪你坐一下。
4. 禁止使用流行語 (如：笑死、暈)。
5. 禁止說任何「你應該怎樣」。

【收尾習慣】
- 對話結尾常留白，或用一句很生活的話結束。
- 例如：「好啦，水差不多滾了。」、「先這樣啦，阿嬤在這。」
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