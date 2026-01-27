
import { Song, Language, ProjectType, ReleaseCategory } from '../types';

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    official1205Cover: "https://drive.google.com/thumbnail?id=1N8W0s0uS8_f0G5w4s5F_S3_E8_v0M_V_&sz=w2000",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

const STANDARD_CREDITS = `© 2025 Willwi Music\n℗ 2025 Willwi Music\nArtist: Willwi 陳威兒`;

export const OFFICIAL_CATALOG: Song[] = [
    // --- ALBUM: 黑灰色 (The Gray) --- UPC: WILLWI20251222 ---
    {
        id: 'TWCC32515441',
        title: '黑灰色',
        isrc: 'TWCC32515441',
        upc: 'WILLWI20251222',
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
    {
        id: 'WILLWI_GRAY_02',
        title: '為愛寫歌',
        isrc: 'TWCC32515442',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'WILLWI_GRAY_03',
        title: '時間線',
        isrc: 'TWCC32515443',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },

    // --- SINGLES & VERIFIED TRACKS ---
    {
        id: 'QZTAZ2592518',
        title: '再愛一次',
        isrc: 'QZTAZ2592518',
        upc: 'UPC_SINGLE_001',
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
        upc: 'WILLWI_EP_01',
        releaseDate: '2025-07-31',
        releaseCategory: ReleaseCategory.EP,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '2cyt5S0Djlph2bZYaO3o5b',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'QT6E52543771',
        title: '茶山',
        isrc: 'QT6E52543771',
        upc: 'UPC_INSTRUMENTAL_01',
        releaseDate: '2025-11-01',
        releaseCategory: ReleaseCategory.Single,
        language: Language.Instrumental,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '7ts6dLdZlKphCKg5gXViMn',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'QT3FB2540638',
        title: '最後的溫柔',
        isrc: 'QT3FB2540638',
        upc: 'UPC_SINGLE_002',
        releaseDate: '2025-10-29',
        releaseCategory: ReleaseCategory.Single,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '4few5rjKvTNm3kithN9Njr',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'QT3FB2540639',
        title: '涙を落',
        isrc: 'QT3FB2540639',
        upc: 'UPC_SINGLE_002',
        releaseDate: '2025-10-29',
        releaseCategory: ReleaseCategory.Single,
        language: Language.Japanese,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '2vUa3seurlt6tSiLOYBIRA',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    },
    {
        id: 'QZZ7P2537961',
        title: '遺憾成星',
        isrc: 'QZZ7P2537961',
        upc: 'UPC_SINGLE_003',
        releaseDate: '2025-09-19',
        releaseCategory: ReleaseCategory.Single,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.defaultCover,
        spotifyId: '6ypLV9lYNWnDRrBhjMgK07',
        isInteractiveActive: true,
        isEditorPick: false,
        credits: STANDARD_CREDITS
    }
    // ... Note: The actual app logic will continue seeding the remaining 74 tracks from DB/JSON import
];
