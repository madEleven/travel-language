---
last_updated: 2026-06-02T05:45:36Z
---

# Architecture Design

## System Overview
单页Web应用，底部Tab导航切换三大功能模块：语句库、收藏夹、地图。纯前端架构，数据存储使用IndexedDB，语音使用Web Speech API，地图使用Google Maps JavaScript API。

## Tech Stack
- React + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- Web Speech API (TTS)
- Google Maps JavaScript API + Places API
- IndexedDB (via idb-keyval for simplicity)
- Service Worker (离线缓存)

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| PhrasesPage | 语句库浏览，按语言/场景分类 | src/pages/PhrasesPage.tsx |
| FavoritesPage | 收藏夹管理 | src/pages/FavoritesPage.tsx |
| MapPage | Google Maps显示附近厕所 | src/pages/MapPage.tsx |
| PhraseCard | 单条语句展示+播放+收藏 | src/components/PhraseCard.tsx |
| BottomNav | 底部Tab导航 | src/components/BottomNav.tsx |
| Data | 语句数据JSON | src/data/phrases.ts |
| Favorites Store | IndexedDB收藏管理 | src/lib/favorites.ts |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| TTS | Web Speech API | 浏览器原生支持，覆盖韩日俄英 |
| 地图 | Google Maps JS API | 全球覆盖，Places API搜索厕所 |
| 离线 | Service Worker | 缓存静态资源+语句数据 |
| 本地存储 | IndexedDB | 持久化收藏数据，容量大 |

## File Tree Plan
```
src/
├── pages/
│   ├── Index.tsx (主页壳，含BottomNav和页面切换)
│   ├── PhrasesPage.tsx
│   ├── FavoritesPage.tsx
│   └── MapPage.tsx
├── components/
│   ├── BottomNav.tsx
│   └── PhraseCard.tsx
├── data/
│   └── phrases.ts
├── lib/
│   └── favorites.ts
└── index.css
```

## Implementation Guide
1. 创建语句数据文件，包含4种语言×5个场景的常用语句
2. 实现IndexedDB收藏管理工具
3. 实现PhraseCard组件（显示+播放+收藏）
4. 实现PhrasesPage（语言选择+场景筛选+语句列表）
5. 实现FavoritesPage（收藏列表）
6. 实现MapPage（Google Maps+附近厕所搜索）
7. 实现BottomNav和主页面壳
8. 配置Service Worker离线缓存

