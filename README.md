# APSM Lab 網站

國立陽明交通大學土木系 先進防護結構與材料實驗室網站原始碼。以 [Eleventy](https://www.11ty.dev/) 產生靜態網頁，中英雙語。

## 日常更新：只改資料檔

所有內容都在 `src/_data/`，不需要碰版面程式。每個欄位都有 `zh`（中文）與 `en`（英文）兩種語言。

| 要更新什麼 | 改哪個檔案 |
| --- | --- |
| 實驗室名稱、教授簡介、聯絡方式、ORCID／Scholar 連結 | `site.json` |
| 首頁數字亮點 | `stats.json` |
| 研究主軸 | `research.json` |
| 產學服務項目 | `services.json` |
| 成員 | `members.json` |
| 著作（`selected: true` 會出現在首頁） | `publications.json` |
| 最新消息（最新的放最上面） | `news.json` |
| 按鈕、標題等介面文字 | `i18n.json` |

在 GitHub 網頁上直接點檔案 → 鉛筆圖示編輯 → 送出 Pull Request，由老師或助理審閱後合併，網站會自動更新。

## 在自己電腦預覽

```bash
npm install
npm run serve   # 打開 http://localhost:8080
npm run build   # 產生 _site/ 資料夾
```

## 注意

- 學生姓名與照片上網前，請先取得本人同意。
- 試驗照片避免出現他人著作權的圖片（例如新聞圖片）。
- 網址或檔名請勿使用中文。
