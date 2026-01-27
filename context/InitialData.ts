import { Song, Language, ProjectType, ReleaseCategory } from '../types';

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    official1205Cover: "https://drive.google.com/thumbnail?id=1N8W0s0uS8_f0G5w4s5F_S3_E8_v0M_V_&sz=w2000",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

const STANDARD_CREDITS = `© 2025 Willwi Music\n℗ 2025 Willwi Music\nArtist: Willwi 陳威兒`;

export const OFFICIAL_CATALOG: Song[] = [
    // --- 專輯作品：黑灰色 (UPC: TWCC32515441) ---
    {
        id: 'TWCC32515441',
        title: '黑灰色',
        isrc: 'TWCC32515441',
        upc: 'TWCC32515441',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        spotifyId: '6ufC4Xo4e2iKAt4V6FIVfy',
        isInteractiveActive: true,
        isEditorPick: true,
        credits: STANDARD_CREDITS
    },
    // --- 單曲作品 ---
    {
        id: 'QZTAZ2592518',
        title: '再愛一次',
        isrc: 'QZTAZ2592518',
        upc: 'QZTAZ2592518',
        releaseDate: '2025-06-15',
        releaseCategory: ReleaseCategory.Single,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '6vPJwgUF9TdPnK5fcUWomq',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'QZWFL2584039',
        title: '折執為詞',
        isrc: 'QZWFL2584039',
        upc: 'QZWFL2584039',
        releaseDate: '2025-07-31',
        releaseCategory: ReleaseCategory.EP,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '2cyt5S0Djlph2bZYaO3o5b',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    }
    // 其他 70+ 首曲目可透過 JSON 備份檔一次性匯入，或透過下方後台功能搜尋專輯後整張同步。
];