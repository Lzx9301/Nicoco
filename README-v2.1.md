# Nicoco — Agreement Generator v2.1：合約資料整合與完整需求附件

基礎：上傳的 `Nicoco-main.zip`（含 `admin-workflow.js`，視為 admin-workflow v1 版本）。沒有重建網站，也沒有改寫既有合約系統；只在既有「合約」建立流程中加入合約資料確認、附件與預覽。

---

## 1. 檔案放置

| 檔案 | 狀態 | 放置位置 | 說明 |
|---|---|---|---|
| `Nicoco-main/quote-detail.html` | **修改** | 網站根目錄（覆蓋） | 載入新檔案；合約建立／編輯畫面加入 v2.1 區塊與預覽（+369／−5 行，其餘程式未動） |
| `Nicoco-main/agreement-data.js` | **新增** | 網站根目錄 | v2.1 純邏輯：原始需求展開、合約需求明細、差異、費用整合、來源指紋、預覽 HTML（不讀寫 Firestore） |
| `Nicoco-main/agreement-v21.css` | **新增** | 網站根目錄 | v2.1 編輯區與預覽樣式（無動畫） |
| `Nicoco-main/firestore.rules` | 未修改 | — | 與上傳版本逐位元組相同 |
| 其餘 `Nicoco-main/*` | 未修改 | — | 與上傳版本相同 |
| `rules-tests/` | **新增** | 與 `Nicoco-main/` 同層 | Rules 測試（自帶 `firestore.rules` 副本，`npm install && npm test`） |
| `logic-tests/` | **新增** | 與 `Nicoco-main/` 同層 | v2.1 純邏輯測試（`node --test`，不需安裝） |

部署：把 `Nicoco-main/` 的三個檔案（`quote-detail.html`、`agreement-data.js`、`agreement-v21.css`）上傳即可。**Firestore Rules 不需要重新發佈。**

---

## 2. 開始前檢查：與需求文件理解的差異

| 項目 | 實際原始碼 |
|---|---|
| `rules-tests/` | **上傳的 ZIP 裡沒有這個資料夾**，因此拿不到原本 117 項測試。本次重新建立 `rules-tests/`（107 項，涵蓋所有現有路徑＋v2.1）。若要與原 117 項合併，請提供原資料夾。 |
| 需求審核狀態 | `confirmedRequirements.items[].decision` 只有 `included／excluded／pending`。文件要求的五種合約狀態（含「另行報價」「已確認的後續變更」）**只存在合約資料中**，沒有改動需求審核。 |
| 報價與需求的對應 | `quotationItems[].reqKey` 對應確認需求的 `key`；`base`＝網站基礎建置、`warranty`＝保固延長。需求審核前建立或手動新增的報價列沒有 `reqKey`。 |
| 已接受報價的正式內容 | 以 `quotes/{id}/acceptances/{clientToken}` 快照為準（`quotes` 上的報價欄位在接受後由 Rules 鎖定，兩者相同）。 |
| 合約既有資料 | `agreements/{id}` 已有 `scopeSnapshot`、`contractAmountSnapshot`、`paymentPlanSnapshot`、條款文字；**沒有來源版本資訊**。狀態流程 draft ⇄ ready → signed → active → completed；Rules 對 draft 內容不設限，ready 之後內容鎖定。 |
| 需求變更（CR） | 原本只在「已建立專案」時才載入。v2.1 建立合約時自行讀取（Admin 本來就有讀取權限）。 |
| 維護費 | 報價沒有獨立的維護費欄位；只有 `warrantyFee`（保固延長）與客戶的維護意向（`projectInfo.interestedInMaintenance`／舊欄位 `maintenanceKey`）。v2.1 不推算維護費，報價中沒有就顯示「未約定」。 |

---

## 3. 功能說明

### 合約建立流程
1. 「＋ 建立合約」時自動讀取：客戶原始需求、確認需求、正式報價（或接受快照）、需求變更。
2. 編輯畫面多一個「合約資料（v2.1）」區塊：
   - **合約需求明細**：每列可選狀態（只會出現該列允許的狀態），展開後可填「最終約定的開發內容／明確不包含／交付成果／驗收依據／備註／待確認事項」。原始需求、審核狀態、對應報價項目為唯讀。
   - **費用分類**：只能調整報價明細的分類，金額不可修改。
3. 「合約資料預覽」⇄「返回編輯」可反覆切換；預覽包含尚未儲存的修改。
4. 「儲存草稿」後留在畫面上，可繼續預覽、編輯、再儲存（按「關閉」離開）。
5. 合約列表每份合約都有「合約資料預覽」（唯讀）。已簽署／鎖定的合約只能看，不能編輯或重新帶入。
6. v2.1 之前建立的合約草稿：編輯時可按「帶入合約資料（v2.1）」補上；已非草稿的舊合約不補產生。

### 預覽內容（7 區）
客戶與案件基本資料／客戶原始需求清單（附件）／最終確認開發項目／排除、待確認與另行報價項目（含原始 vs 確認差異表）／開發費用明細（含分期付款）／維護與額外修改費用／尚缺少的必要資訊。

### 合約狀態規則

| 狀態 | 何時可用 | 是否為開發義務 |
|---|---|---|
| 已納入開發 | 只有「確認需求＝納入」，或**沒有確認需求的舊案件中、客戶已接受的報價明細** | 是 |
| 已確認的後續變更 | 只有已核准（approved）的需求變更，且固定為此狀態 | 是 |
| 待確認 | 未經確認的原始需求、確認需求中仍待確認、提案中的需求變更、未接受報價的明細 | 否 |
| 另行報價 | Admin 手動指定 | 否 |
| 明確排除 | 確認需求＝排除（預設），或 Admin 手動指定 | 否 |

- 客戶曾勾選 ≠ 合約包含：需求未審核時，所有原始需求一律「待確認」，且**不能**改成「已納入開發」。
- 確認需求已排除的項目，不能在合約中改回「已納入開發」（需回到需求審核）。
- 狀態限制在畫面、儲存前（`sanitizeItems`）各檢查一次。
- 合約狀態與預設不同時，預覽差異表會列出。
- 無法可靠對應報價項目的列標示「待人工確認」；原始資料沒有的交付成果、驗收依據、不包含項目一律留空，不代填。

### 費用規則
- 金額只引用報價明細（已接受時用接受快照）與已核准的需求變更；本輪沒有改動任何報價計算。
- 分類：`base`→網站開發費、`warranty`→維護／保固、對應到含第三方服務的確認需求→第三方服務串接費、其他確認需求→個別功能／模組；沒有對應依據的列為「待人工分類」，可由 Admin 指定分類（不改金額）。
- 報價只有總額（無明細，或只有舊欄位 `officialPrice`）時，各類費用一律顯示「待人工拆分確認」，不推算。
- 合約總額無法對應「報價總額」或「報價＋已核准變更」時，標示「待人工確認」。

---

## 4. 資料結構（`quotes/{quoteId}/agreements/{agreementId}` 新增欄位）

既有欄位全部保留、意義不變。新增：

| 欄位 | 說明 |
|---|---|
| `agreementSchemaVersion` | `'2.1'`（沒有此欄位＝v1 合約） |
| `contractData.schemaVersion` | `'2.1'` |
| `contractData.capturedAt` | 帶入來源的時間（Timestamp） |
| `contractData.sources` | 帶入當時的來源版本與指紋：`requirementSnapshot`（需求書版本）、`confirmedRequirements`（revision）、`quotation`（來源 quote／acceptance、狀態、版本、總額）、`changeRequests`（已核准／提案中筆數）、`legacy`；每項有 `fp` 指紋 |
| `contractData.originalRequirementSnapshot` | 客戶原始需求的**完整副本**（附件；沒有需求書時為 null） |
| `contractData.originalLegacyFields` | 沒有需求書的舊案件：舊估價欄位副本 |
| `contractData.originalQuoteFields` | 需求單上的補充說明、預算、預計上線 |
| `contractData.confirmedRevision` / `confirmedItemsIndex` | 帶入時的確認需求版本與項目索引（費用分類用） |
| `contractData.quotationSnapshot` | 帶入時的報價：明細、小計、折扣、稅額、總額、付款條件、來源、接受時間 |
| `contractData.changeRequestsSnapshot` | 已核准與提案中的需求變更 |
| `contractData.items[]` | 合約需求明細（見下表） |
| `contractData.feeCategoryOverrides` | `{ 報價明細 id: 分類 }`，只存 Admin 指定的分類 |
| `contractData.maintenance` | 保固、維護意向、修改說明、第三方責任（皆為需求單上的資料，非約定） |
| `contractData.changePolicy` | **預留**：設計／開發／驗收三階段 `freeRevisionRounds`、`coveredItems`、`workloadCapHours`、`note`；`defectVsChange`（缺陷修正 vs 付費變更定義）。本輪全為空值，無介面 |
| `contractData.termsVersion` | **預留**：`{ id, label, effectiveDate }` |
| `contractData.resyncCount` / `loadWarnings` | 重新帶入次數；帶入時讀取失敗的來源 |

`contractData.items[]` 主要欄位：

| 欄位 | 說明 |
|---|---|
| `contractItemId` | 合約項目識別碼 `CI-XXXXXXXX`（由來源種類＋需求 key 決定，重新帶入時不變；供未來 AI 分析引用） |
| `requirementKey` / `changeRequestId` / `quotationItemIds` | 對應需求、需求變更、報價明細的識別碼 |
| `sourceKind` | `confirmed`／`snapshot_unconfirmed`／`snapshot_missing`／`legacy`／`quotation_line`／`change_request`／`change_proposal` |
| `originalContent`、`originType` | 原始需求內容；`client`／`admin_added`／`quotation`／`change_request` |
| `reviewDecision`、`confirmedDescription`、`confirmedRevision` | 審核狀態與確認描述 |
| `basis`、`defaultStatus`、`contractStatus`、`allowedStatuses` | 狀態依據、預設、目前狀態、允許的狀態 |
| `agreedScope`、`exclusions`、`deliverables`、`acceptanceCriteria`、`notes`、`openQuestions` | Admin 可編輯 |
| `quotationMapping`、`flags` | 報價對應狀態（mapped／base_included／manual_check）與待人工確認原因 |
| `autoFields` | 自動帶入的預設文字（重新帶入時判斷 Admin 是否改過） |

### 資料與版本安全
- 只寫入 `agreements/{id}` 與 `activityLogs`（arrayUnion），不寫入 `requirementSnapshot`、`requirementReviewDraft`、`confirmedRequirements`、報價欄位、`publicQuotations`。
- 合約保存帶入當時的來源快照；之後來源更新時，編輯畫面與預覽只顯示「哪些來源已更新」，**不會自動改寫**。
- 「重新帶入來源資料」需要二次確認；已填寫的內容依 `contractItemId` 保留，不再允許的狀態會重設並列出；仍需按「儲存草稿」才寫入。
- 已備妥之後的合約：介面不提供編輯／重新帶入；Rules 也拒絕任何內容變更（見 B-2 測試）。
- 標記「已備妥」時，若合約資料仍有「必要」缺漏，確認視窗會列出（只提醒，不改變既有流程）。

### 相容性
- 舊案件（沒有需求書、沒有確認需求、只有總額或 `officialPrice`）：可正常建立合約；項目一律待確認，費用顯示待人工拆分確認。
- 舊合約（v1）：列表、狀態轉換、詳細資料照舊；草稿可選擇補帶入，非草稿不補。
- 沒有資料遷移、沒有 backfill；不影響報價、專案、分期收款、驗收功能與流程導覽。

---

## 5. Firestore Rules

**未修改。** v2.1 的新資料全部放在既有的 `quotes/{quoteId}/agreements/{agreementId}`（Admin-only 讀寫），沒有新增任何讀寫路徑，也沒有新增公開資料。既有規則已經保證：

- 非草稿合約的內容不可變更（ready → signed 等轉換只允許狀態欄位）；
- `requirementSnapshot`、確認需求、已接受報價不可在一般寫入中被修改。

新的 `rules-tests/` 加入 v2.1 寫入情境（B-1～B-3）驗證上述保證對 `contractData` 同樣成立。

---

## 6. 測試結果

| 測試 | 結果 | 環境 |
|---|---|---|
| `logic-tests/`（驗收條件 1～7 ＋ 指紋、舊案件） | **實際執行：9／9 通過** | Node 22.23.4 |
| 後台 UI 煙霧測試（Playwright＋模擬 Firebase，未隨附） | **實際執行：31／31 通過**，無頁面錯誤 | Chromium（headless） |
| `rules-tests/`（107 項） | **未執行** | 見下 |

UI 煙霧測試涵蓋：建立合約→展開編輯→排除項目沒有「已納入開發」選項→調整費用分類→預覽 7 區（含 LINE Pay 等「其他」文字、自由文字、差異）→返回編輯內容保留→建立草稿（寫入 `contractData`，案件文件只新增 `activityLogs`）→再次儲存→`requirementSnapshot`／`confirmedRequirements`／報價明細未變→核准一筆需求變更後預覽出現「來源已更新」且已存合約未被改寫→重新帶入（保留人工內容、按儲存前不寫入）→已簽署合約唯讀、`openAgreementBuilder` 拒絕→標記已備妥時列出必要缺漏→報價／專案區塊正常。

### 尚未測試的項目與原因
- **Rules 測試未執行**：此工作環境無法連到 npm registry 與 Firebase Emulator 下載來源（皆被網路政策擋下），無法安裝 `firebase-tools`／`@firebase/rules-unit-testing`，也無法啟動 Emulator。測試檔僅做過語法檢查與流程結構檢查（以替身模組執行，確認 107 項的測試程式本身可以跑完，不代表規則判斷結果）。`firestore.rules` 與原版逐位元組相同，原 117 項測試理論上不受影響，但未實際驗證。請在本機執行 `cd rules-tests && npm install && npm test`。
- **真實 Firebase 寫入**：UI 測試使用模擬 Firestore（含 undefined／巢狀陣列檢查），未對正式或 Emulator 資料庫實際寫入；文件大小（含原始需求副本）在測試資料中約數十 KB，遠低於 1 MB 上限，但極大型需求單未測。
- **手機版面**：只在 1000～1200px 寬度截圖檢查。
- **與原 117 項 Rules 測試合併**：缺原始檔。

---

## 7. 本輪未做（依需求文件）
PDF 匯出、電子簽署、AI API、GitHub 串接、自動修改網站、各階段免費修改條件的介面（只預留資料結構）、改寫合約系統。

### 已知限制
- 在編輯畫面按「取消／關閉」會直接捨棄未儲存的修改（沿用既有合約編輯行為，沒有額外確認）。
- 既有的「工作內容／工作範圍」（`scopeSnapshot`）仍保留為摘要欄位；正式開發義務以「合約需求明細」的狀態為準。兩者不會自動同步。
- `rules-tests/package.json` 的套件版本（`firebase-tools ^13`、`firebase ^10`、`@firebase/rules-unit-testing ^3`）未能在此環境安裝驗證；若你本機原本的 rules-tests 用的是其他版本，以你的版本為準。
