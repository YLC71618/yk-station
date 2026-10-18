# 又鍇站 YK Station：交給 Claude Code 的步驟

## 1. 放好資料夾
把這個資料夾解壓縮到你電腦上，例如 `Documents/yk-station`，然後在這個資料夾裡開 Claude Code。

裡面有：
- `SPEC.md`：完整規格（功能、資料庫、規則、推播、做的順序）
- `CLAUDE.md`：Claude Code 每次都會讀的工作守則
- `design/`：定案的 6 個設計稿
- `assets/`：你們的 Q 版頭像、熊熊、App icon

## 2. 貼這段給 Claude Code 開工

```
請先讀 CLAUDE.md、SPEC.md 和 design/README.md。
這是我和男朋友兩個人用的 PWA，規格和設計稿都定案了。
請照 SPEC.md 第 9 節的順序一個 milestone 一個 milestone 做，
每做完一個就告訴我怎麼在 iPhone 上測試，然後 commit。
需要我註冊帳號或給金鑰的時候先停下來，一步一步教我。
重要的技術（登入、RLS、推播、service worker）做的時候簡單解釋給我聽。
先從 milestone 0 開始，開始前先確認我電腦有沒有裝 Node.js 和 Git。
```

## 3. 過程中你要註冊的帳號（只要 2 個，都免費）
- [ ] **GitHub**：放程式碼 + 把 App 放上網（GitHub Pages）
- [ ] **Supabase**：兩支手機共用的資料、登入、照片、推播（直接用 GitHub 帳號登入）

另外先準備好：**你和鍇鍇各一個 email**（只有這兩個能登入，登入時會收到 6 位數驗證碼）。

## 4. 做好之後怎麼裝到 iPhone
1. 用 **Safari** 打開 App 網址
2. 分享按鈕 → **加入主畫面**
3. 從主畫面打開 → 按「開啟通知」
4. 鍇鍇的手機也做一次

## 5. 注意
- Supabase 免費專案 **一週沒人用會暫停**，每天用就不會
- 規則數字都在 `src/config/rules.ts`，之後想改直接叫 Claude Code 改
- **車票、語音** 還沒有設計稿，在 SPEC.md 的 Phase 2，核心做完再一起設計
