---
last_updated: 2026-06-02T05:45:36Z
status: active
---

# Project Context

## Project Overview
出国旅行语言工具Web App，收录韩语、日语、俄语、新加坡英语等多国热门常用语句，用户可点击播放语音发音，支持语句收藏夹功能，并对接Google Maps显示附近厕所位置，同时提供离线模式以便在无网络环境下使用核心功能。

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-06-01 | 语音播放使用Web Speech API | Mike | 覆盖主流语言TTS，无需额外后端 |
| 2026-06-01 | 地图服务使用Google Maps JavaScript API | Mike | 用户选择，全球覆盖度高，Places API可搜索附近厕所 |
| 2026-06-01 | 离线模式使用Service Worker + IndexedDB | Mike | 缓存静态资源和语句数据，实现离线可用 |
| 2026-06-01 | UI采用底部Tab导航：语句库/收藏夹/地图 | Mike | 三大功能模块清晰分离，移动端友好 |

## Constraints
- 仅Web端，不涉及原生App或后端服务
- Google Maps API需要有效API Key，地图功能需联网
- 离线模式下地图不可用，仅语句库和收藏夹可离线
- 支持语言：韩语、日语、俄语、新加坡英语（可扩展）
- 移动端优先响应式设计


