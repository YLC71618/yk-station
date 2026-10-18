# Design mockups

These `.dc.html` files are the approved mockups for each screen (390 × 844 phone frame).
They were made in Claude's Design canvas and reference a `support.js` runtime that is **not** included,
so they will not run on their own. Read them as markup: layout, copy, colours, spacing and the inline
SVG illustrations are all literal in the files. The `<script type="text/x-dc">` block at the bottom of
each file shows the intended interaction logic (state, handlers) in plain JavaScript.

Interactive version (Yoyo's private link, open while signed in to her Claude account):
https://claude.ai/artifact/1Tk8HEUxPHLWkbKAdDXJtH

| File | Screen | Route |
|---|---|---|
| `Main.dc.html` | 熊熊病房 Ward (home) | `/` |
| `Yoyo.dc.html` | 又又的分頁 | `/yoyo` |
| `Kyle.dc.html` | 鍇鍇的分頁 (as seen on Kyle's phone) | `/kyle` |
| `Food.dc.html` | 今天吃什麼 | `/food` |
| `Shopping.dc.html` | 購物清單 | `/lists` |
| `Settings.dc.html` | 設定 · 語言 · 規則 | `/settings` |

Sample numbers in the mockups (coins 120 / 85, 3 of 8 cups, score 6, "住院第 [12] 天") are placeholders;
real values come from the database. Text in square brackets is a placeholder too.

`../assets/` holds the same illustrations as standalone SVGs: both avatars, the bear in bed (sick
state) and the bear-face app icon. The healthy-bear variant (closed happy eyes, floating hearts,
no plaster or thermometer) is in `Main.dc.html` inside the `{{healthy}}` block.
