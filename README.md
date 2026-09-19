# Micy花在哪

把不同銀行的信用卡月結單交易集中整理成統一帳本，介面與 `micy-card-rewards.micyying.chatgpt.site` 版本一致，支援 PDF 匯入、交易搜尋、卡片／月份／收支／分類篩選、CSV／PDF 匯出及 JSON 備份。

這是獨立於「Micy刷哪張」的 GitHub Pages 專案，使用自己的本機儲存鍵及備份格式，不會讀取或覆蓋另一個 app 的資料。

## 主要功能

- 頂部回贈統計只計回贈，不包還款和退款。
- 分開 AEON Wakuwaku／Purple 與中銀 Go 鑽石／白金卡。
- 自動分類食飯、海外實體、交通、RentSmart、網購、超市、ApplePay、八達通增值、機票及酒店等消費。
- 可在交易表手動修改日期、銀行／卡類、描述、金額、交易類型及消費類別。
- 渣打國泰和無法確定日子的 Odd Cents 交易只顯示結單月份。

## 私隱

- 交易與原始 PDF 預設只保存在目前裝置的瀏覽器。
- 可用 JSON 備份在不同裝置之間轉移交易資料。
- GitHub repository 只包含 app 程式碼，不包含使用者上傳的月結單或交易資料。
