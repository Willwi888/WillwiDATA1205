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

export const generateMusicCritique = async (song: Song): Promise<string> => {
  const client = getClient();
  if (!client) return "請先設定 Google Gemini API Key 才能使用 AI 樂評功能。";

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
    1. **曲風與配器 (Genre & Instrumentation)**：從 Credits 或描述中尋找線索（如吉他、鋼琴、合成器等），分析歌曲的流派風格（如 Acoustic, Pop, Ballad, Electronic 等）與聽感氛圍。
    2. **歌詞主題 (Lyrical Themes)**：若是人聲歌曲，請分析歌詞傳達的核心情感（如失戀、自我探索、社會觀察等）；若是純音樂，請描繪旋律帶來的畫面感。
    3. **藝人特色**：強調 Willwi 在${song.language}作品中的演繹特色或專案背景（${song.projectType}）的實驗性。
    4. **語氣**：專業、溫暖且具啟發性，像是在推薦一張好唱片。
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
 * Generate Video using Veo Model
 * Supports Text-to-Video and Image-to-Video
 */
export const generateAiVideo = async (
  prompt: string, 
  imageBase64?: string, 
  mimeType: string = 'image/png'
): Promise<string | null> => {
  try {
    // 1. Check for API Key selection (Required for Veo)
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            // Race condition mitigation: assume success if dialog closes
        }
    }

    // 2. Initialize Client with the key from process.env (which is injected by the selection above)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation;

    // 3. Configure Request
    if (imageBase64) {
        // Image-to-Video
        console.log("Starting Image-to-Video generation...");
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt || "Animate this image cinematically",
            image: {
                imageBytes: imageBase64,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9' 
            }
        });
    } else {
        // Text-to-Video
        console.log("Starting Text-to-Video generation...");
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });
    }

    // 4. Poll for completion
    console.log("Video generating... polling operation.");
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // 5. Retrieve Result
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    // 6. Fetch the actual blob (requires appending key)
    const downloadUrl = `${videoUri}&key=${process.env.API_KEY}`;
    
    // We fetch it here to turn it into a local Blob URL for the browser to display easily
    const videoRes = await fetch(downloadUrl);
    const videoBlob = await videoRes.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Veo Video Generation Error:", error);
    throw error;
  }
};

export const getGeminiClient = () => getClient();

export const GRANDMA_SYSTEM_INSTRUCTION = `
你現在扮演「泡麵聲學院」的校長兼吉祥物，名字叫做「泡麵阿嬤」。
你的個性設定如下：
1. 說話風格：使用繁體中文，帶有台灣長輩的親切感與幽默，偶爾會穿插一兩句台語口頭禪（如：這就對了、乖孫）。
2. 關於 Willwi：你是 Willwi 的超級粉絲兼阿嬤，非常以他的多語音樂創作為榮。你會極力推薦大家去聽他的歌。
3. 關於泡麵：你非常喜歡吃泡麵，認為泡麵是創作音樂的最佳良伴。如果有人說肚子餓，你會推薦他去吃泡麵。
4. 互動方式：熱情、有點嘮叨但充滿愛。
5. 任務：回答訪客關於 Willwi 音樂的問題，或者單純閒聊陪伴。
請保持這個角色設定進行對話。
`;