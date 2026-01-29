
import { Song, Language, ProjectType, ReleaseCategory } from '../types';

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    official1205Cover: "https://drive.google.com/thumbnail?id=1N8W0s0uS8_f0G5w4s5F_S3_E8_v0M_V_&sz=w2000",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

// Helper to generate consistent IDs based on Pinyin/English to ensure stability
const id = (str: string) => str.replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const STANDARD_CREDITS = `© 2025 Willwi Music
℗ 2025 Willwi Music

Main Artist : Willwi 陳威兒
Composer : Tsung Yu Chen
Lyricist : Tsung Yu Chen
Arranger : Willwi
Producer : Will Chen
Recording Engineer | Will Chen
Mixing Engineer | Will Chen
Mastering Engineer | Will Chen
Recording Studio | Willwi Studio, Taipei
Label | Willwi Music`;

export const OFFICIAL_CATALOG: Song[] = [
    // --- ALBUM: 黑灰色 (The Gray) ---
    // UPC: WILLWI20251222 | Date: 2025-12-22
    {
        id: id('Heihuise_Title_Track'),
        title: '黑灰色',
        isrc: 'TWUM001',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: true,
        origin: 'local',
        translations: { en: { title: 'The Gray' } },
        credits: STANDARD_CREDITS,
        lyrics: '',
        audioUrl: ''
    },
    {
        id: id('WeiAiXieGe'),
        title: '為愛寫歌',
        isrc: 'TWUM002',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        origin: 'local',
        translations: { en: { title: 'Song For Love' } },
        credits: STANDARD_CREDITS,
        lyrics: '',
        audioUrl: ''
    },
    {
        id: id('ShiJianXian'),
        title: '時間線',
        isrc: 'TWUM003',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        origin: 'local',
        translations: { en: { title: 'Timeline' } },
        credits: STANDARD_CREDITS,
        lyrics: '',
        audioUrl: ''
    },
    {
        id: id('WeiXiaoXinShi'),
        title: '微小心事',
        isrc: 'TWUM004',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        origin: 'local',
        translations: { en: { title: 'Subtle Thoughts' } },
        credits: STANDARD_CREDITS,
        lyrics: '',
        audioUrl: ''
    },
    {
        id: id('ShaoNian'),
        title: '少年',
        isrc: 'TWUM005',
        upc: 'WILLWI20251222',
        releaseDate: '2025-12-22',
        releaseCategory: ReleaseCategory.Album,
        language: Language.Mandarin,
        projectType: ProjectType.Indie,
        coverUrl: ASSETS.official1205Cover,
        isInteractiveActive: true,
        isEditorPick: false,
        origin: 'local',
        translations: { en: { title: 'Youth' } },
        credits: STANDARD_CREDITS,
        lyrics: '',
        audioUrl: ''
    },

    // --- SINGLES & EPs ---
    { id: id('Echoes'), title: '回憶 (Echoes)', isrc: 'TWECHOES2026', releaseDate: '2026-02-06', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: true, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('XinHuang'), title: '心慌', isrc: 'TWXINHUANG', releaseDate: '2025-11-17', releaseCategory: ReleaseCategory.EP, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('PendulumInReverse'), title: 'Pendulum in Reverse', isrc: 'TWPENDULUM', releaseDate: '2025-11-01', releaseCategory: ReleaseCategory.Single, language: Language.English, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ZaiJianDeYiShu'), title: '再見的藝術', isrc: 'TWGOODBYE', releaseDate: '2025-10-29', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('Forever'), title: 'Forever', isrc: 'TWFOREVER', releaseDate: '2025-10-15', releaseCategory: ReleaseCategory.EP, language: Language.English, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShuoZaiJian'), title: '說再見', isrc: 'TWSAYGOODBYE', releaseDate: '2025-10-03', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('DuanGeXingWang'), title: '短歌行 忘', isrc: 'TWFORGET', releaseDate: '2025-10-03', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('GuangNian'), title: '光年', isrc: 'TWLIGHTYEAR', releaseDate: '2025-09-20', releaseCategory: ReleaseCategory.EP, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('YiHanDeXingChen'), title: '遺憾的星塵', isrc: 'TWSTARDUST', releaseDate: '2025-09-19', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WoDeShengHuo'), title: '我的生活', isrc: 'TWLAVIE', releaseDate: '2025-09-19', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('IfICould'), title: 'If I could', isrc: 'TWIFICOUD', releaseDate: '2025-09-19', releaseCategory: ReleaseCategory.Single, language: Language.English, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ChuKou'), title: '出口', isrc: 'TWEXIT', releaseDate: '2025-09-12', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WeiShuoChuKou'), title: '未說出口的保重', isrc: 'TWTAKECARE', releaseDate: '2025-09-11', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WuZhuZhiDi'), title: '無主之地', isrc: 'TWNOMANSLAND', releaseDate: '2025-09-06', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CongQian'), title: '從前', isrc: 'TWONCEUPON', releaseDate: '2025-09-01', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('QueKou'), title: '缺口', isrc: 'TWGAP', releaseDate: '2025-08-27', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('LiuLianLoseLong'), title: '留戀 LOSE & LONG', isrc: 'TWLOSELONG', releaseDate: '2025-08-16', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('AiGuo'), title: '愛過', isrc: 'TWLOVED', releaseDate: '2025-08-13', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WuJinDeYanLei'), title: '無盡的眼淚', isrc: 'TWTEARS', releaseDate: '2025-08-08', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShiWuZhaoLing'), title: '失物招領', isrc: 'TWLOSTFOUND', releaseDate: '2025-08-06', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ZheZhiWeiCi'), title: '折執為詞', isrc: 'TWORDSOFOBSESSION', releaseDate: '2025-07-31', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('YiHan'), title: '遺憾', isrc: 'TWREGRET', releaseDate: '2025-07-26', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('FangXiaYiHan'), title: '放下遺憾', isrc: 'TWLETTINGGO', releaseDate: '2025-07-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('LaiGuo'), title: '來過', isrc: 'TWWASHERE', releaseDate: '2025-07-11', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('LaiLeGeJiMo'), title: '來了個寂寞', isrc: 'TWLONELINESS', releaseDate: '2025-07-09', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('BiAnMoNian'), title: '彼岸默念', isrc: 'TWSILENTPRAYER', releaseDate: '2025-07-06', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShiNianYiSha'), title: '十年一霎', isrc: 'TWTENYEARS', releaseDate: '2025-07-02', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('XieHaoDeJuDian'), title: '寫好的句點', isrc: 'TWFULLSTOP', releaseDate: '2025-07-02', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WoMenDouDongLe'), title: '我們都懂了', isrc: 'TWWEUNDERSTAND', releaseDate: '2025-06-26', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CuoWeiShiKong'), title: '錯位時空', isrc: 'TWDISPLACED', releaseDate: '2025-06-23', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('JiuXinHeJie'), title: '揪心和解', isrc: 'TWHEARTWRENCHING', releaseDate: '2025-06-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CiWei'), title: '刺蝟', isrc: 'TWHEDGEHOG', releaseDate: '2025-06-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ZaiAiYiCi'), title: '再愛一次', isrc: 'TWLOVEAGAIN', releaseDate: '2025-06-15', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('QingTian'), title: '晴天', isrc: 'TWSUNNY', releaseDate: '2025-06-11', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('BeiWei'), title: '卑微', isrc: 'TWHUMBLE', releaseDate: '2025-06-06', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('AiErBuDe'), title: '愛而不得', isrc: 'TWUNREQUITED', releaseDate: '2025-05-23', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ZiZuoZiShou'), title: '自作自受', isrc: 'TWDESERVED', releaseDate: '2025-05-23', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('HaoShuoHaoAiWo'), title: '好說好愛我', isrc: 'TWEASYTOLOVE', releaseDate: '2025-05-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CanRenDeWenRou'), title: '殘忍的溫柔', isrc: 'TWCRUELKIND', releaseDate: '2025-05-13', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('TaCengShuoAiWo'), title: '他曾說愛我', isrc: 'TWHESAIDLOVED', releaseDate: '2025-05-13', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('GuMeng'), title: '故夢', isrc: 'TWOLDDREAM', releaseDate: '2025-05-05', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('BianYuanMuZhiMing'), title: '邊緣墓誌銘', isrc: 'TWEPITAPH', releaseDate: '2025-05-04', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WenRouDeCiBei'), title: '溫柔的慈悲', isrc: 'TWMERCY', releaseDate: '2025-05-02', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('BuShuoAi'), title: '不說愛', isrc: 'TWWITHOUTLOVE', releaseDate: '2025-05-01', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WeiZhuiLuoDeBaoZhong'), title: '未墜落的保重', isrc: 'TWUNFALLENCARE', releaseDate: '2025-04-28', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('YongBuKaiDeXiang'), title: '永不開的香', isrc: 'TWINCENSE', releaseDate: '2025-04-25', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WeiShengDuBai'), title: '尾聲獨白', isrc: 'TWEPILOGUE', releaseDate: '2025-04-24', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('QianZouNianBai'), title: '前奏念白', isrc: 'TWINTRO', releaseDate: '2025-04-23', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShuoBuChuDeZaiJian'), title: '說不出的再見', isrc: 'TWUNSPOKENGB', releaseDate: '2025-04-21', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('SiNianHuBo'), title: '思念湖泊', isrc: 'TWLAKEOFMISS', releaseDate: '2025-04-20', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('NiShuoDeDouShiZhenDe'), title: '你說的都是真的', isrc: 'TWTRUTH', releaseDate: '2025-04-19', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('PaoMoLunKuo'), title: '泡沫輪廓', isrc: 'TWBUBBLE', releaseDate: '2025-04-18', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('DiQiGeLuKou'), title: '第七個路口', isrc: 'TW7THCROSSING', releaseDate: '2025-04-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('LingHunHuiSheng'), title: '靈魂回聲', isrc: 'TWSOULECHO', releaseDate: '2025-04-16', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('NiHongHuiSheng'), title: '霓虹迴聲', isrc: 'TWNEONECHO', releaseDate: '2025-04-15', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('NaNianHuangHun'), title: '那年黃昏', isrc: 'TWDUSK', releaseDate: '2025-04-12', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('RuGuoAiXingLe'), title: '如果愛醒了', isrc: 'TWLOVEAWAKE', releaseDate: '2025-03-31', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ZhiTongYao'), title: '止痛藥', isrc: 'TWPAINKILLER', releaseDate: '2025-03-22', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('DianTaiQingGe'), title: '電台情歌', isrc: 'TWRADIOLOVE', releaseDate: '2025-03-22', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ChenAi'), title: '塵埃', isrc: 'TWDUST', releaseDate: '2025-03-22', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CunZaiDeYiYi'), title: '存在的意義', isrc: 'TWEXISTENCEJP', releaseDate: '2025-03-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('HaoHaoShuoZaiJian'), title: '好好說再見', isrc: 'TWPROPERGOODBYE', releaseDate: '2025-03-17', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('YuShengDeXiu'), title: '餘生的鏽', isrc: 'TWRUST', releaseDate: '2025-03-16', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShiErBuDe'), title: '失而不得', isrc: 'TWLOSTNEVER', releaseDate: '2025-03-16', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('AlmostLover'), title: 'Almost Lover', isrc: 'TWALMOSTLOVER', releaseDate: '2025-03-15', releaseCategory: ReleaseCategory.Single, language: Language.English, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('WoManZheSuoYouRenAiNi'), title: '我瞞著所有人愛你', isrc: 'TWSECRETHIDDEN', releaseDate: '2025-03-15', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('XingZouXingZou'), title: '行走，行走', isrc: 'TWWALKING', releaseDate: '2025-03-15', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('YeFengDaiZou'), title: '夜風帶走', isrc: 'TWNIGHTWIND', releaseDate: '2025-03-12', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('CunZaiRadioEdit'), title: '存在 (Radio Edit)', isrc: 'TWEXISTENCE', releaseDate: '2025-03-12', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('NiDeShiJieWoCengJingLaiGuo'), title: '你的世界 我曾經來過', isrc: 'TWWASINYOURWORLD', releaseDate: '2025-03-09', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('RuGuoAiDongLe'), title: '如果愛懂了', isrc: 'TWIFLOVEUNDERSTOOD', releaseDate: '2025-03-09', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ChongLai'), title: '重來', isrc: 'TWRESTART', releaseDate: '2025-03-08', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('BuXiuZhiSheng'), title: '不朽之聲', isrc: 'TWUNFADINGVOICE', releaseDate: '2025-03-08', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('DuZiYiRen'), title: '獨自一人', isrc: 'TWALONEINHOUSE', releaseDate: '2025-03-08', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('Maka_Return'), title: '戻れない時間', isrc: 'QZHN72590428', upc: '199079066892', releaseDate: '2025-03-08', releaseCategory: ReleaseCategory.Single, language: Language.Japanese, projectType: ProjectType.Indie, coverUrl: 'https://i.scdn.co/image/ab67616d0000b27312da053cb3da678d1148a468', isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('RuGuoNiXiangQiWo'), title: '如果你想起我', isrc: 'TWIFYOUTHINKOFME', releaseDate: '2025-03-05', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('SuiYueXian'), title: '歲月線', isrc: 'TWYEARSLINE', releaseDate: '2025-03-03', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ChiLaiDeTongZhi'), title: '遲來的通知', isrc: 'TWLATEWORD', releaseDate: '2025-03-03', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS },
    { id: id('ShuoBuChuDeGoodbyeFeb'), title: 'Shuo Bu Chu De Goodbye', isrc: 'TWUNSPOKENGBFEB', releaseDate: '2025-02-25', releaseCategory: ReleaseCategory.Single, language: Language.Mandarin, projectType: ProjectType.Indie, coverUrl: ASSETS.defaultCover, isInteractiveActive: true, isEditorPick: false, origin: 'local', credits: STANDARD_CREDITS }
];
