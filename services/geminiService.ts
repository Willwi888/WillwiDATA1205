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
    你是一位專業的繁體中文資深樂評人。請為音樂人 Willwi 的這首作品撰寫一段約 150-200 字的短評與介紹。
    
    歌曲資訊：
    - 歌名：${song.title} ${song.versionLabel ? `(${song.versionLabel})` : ''}
    - 語言：${song.language}
    - 發行日期：${song.releaseDate}
    - 專案背景：${song.projectType}
    ${song.lyrics ? `- 歌詞片段參考：${song.lyrics.substring(0, 100)}...` : ''}
    ${song.description ? `- 創作背景：${song.description}` : ''}
    
    評論風格要求：
    1. 專業且溫暖，鼓勵獨立音樂創作。
    2. 強調多語創作的特色。
    3. 如果是「泡麵聲學院」作品，請提到其實驗性或趣味性；如果是獨立發行，強調其個人情感。
    4. 輸出格式為純文字，不要用 markdown 標題。
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