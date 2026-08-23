# 貢獻指南

感謝您協助改進 AI English Method Coach。請先確認變更不會破壞 Local-first、資料不外傳與「缺少內容時不臆造」三項原則。

## 開發流程

1. Fork 專案並從 `main` 建立功能分支。
2. 安裝依賴：`npm install`。
3. 進行修改並補上對應測試。
4. 執行 `npm run verify`。
5. 建立 Pull Request，清楚說明問題、解法與驗證結果。

## Pull Request 驗收

- TypeScript 不可出現型別錯誤。
- ESLint 必須通過。
- 排程、資料遷移與分析公式需有單元測試。
- IndexedDB 多筆關聯寫入需維持原子交易。
- 桌機與手機版面皆需可操作。
- 不提交 `.env`、部署識別、建置產物、完整未授權字庫或個人資料。

## Commit 建議格式

```text
feat: add category filter
fix: preserve due reviews after CSV import
test: cover analytics date window
docs: clarify CSV schema
```

## 資料貢獻

新增字庫或例句前，必須確認內容為自行編寫、公共領域或具備可公開再散布的授權，並在 Pull Request 中說明來源與授權。
