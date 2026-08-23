# 安全政策

## 支援版本

目前僅維護 `main` 分支的最新版本。

## 私下通報

若問題涉及資料外洩、任意程式碼執行、跨站腳本、供應鏈或隱私風險，請不要先建立公開 Issue。請透過 GitHub Repository 的 **Security → Report a vulnerability** 私下回報。

通報內容建議包含：

- 受影響版本或 Commit
- 可重現步驟
- 預期與實際結果
- 可能影響
- 建議修正方式（若有）

## 安全邊界

- 本專案採 Local-first，學習資料預設不離開瀏覽器。
- 使用者仍需自行確認匯入 CSV 的內容與授權。
- 不應在公開 Issue、CSV 或截圖中附上個人資料、Token、Cookie 或其他憑證。
