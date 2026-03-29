# 打卡系統部署說明

## 系統概覽

- **前端**：`/` — 業務人員使用的簽到/請假/拜訪頁面
- **後台**：`/admin` — 管理員使用的管理介面  
- **資料庫**：Google Sheets（無需伺服器資料庫）
- **部署**：Vercel（透過 GitHub）
- **通知**：Telegram Bot

---

## Step 1：建立 Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com) 建立新試算表
2. 記下網址中的 **Spreadsheet ID**（格式：`/d/XXXX...XXXX/edit`）

> 工作表結構會在首次登入後台 → 系統設定 → 「初始化 Google Sheets」時**自動建立**

---

## Step 2：設定 Google Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案或選擇現有專案
3. 啟用 **Google Sheets API**
4. 前往 IAM → 服務帳戶 → 建立服務帳戶
5. 建立後，點選「新增金鑰」→ JSON 格式，下載 JSON 檔案
6. 回到 Google Sheets → 分享 → 將服務帳戶 email 加入為**編輯者**

### 從 JSON 取得環境變數值

```json
{
  "client_email": "xxx@xxx.iam.gserviceaccount.com",  ← GOOGLE_SERVICE_ACCOUNT_EMAIL
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n..." ← GOOGLE_PRIVATE_KEY
}
```

---

## Step 3：建立 Telegram Bot

1. 與 [@BotFather](https://t.me/BotFather) 私訊 `/newbot`
2. 依指示建立 Bot，取得 **Bot Token**
3. 若要取得 Chat ID：
   - 個人：傳訊息給 Bot，再訪問 `https://api.telegram.org/bot{TOKEN}/getUpdates`
   - 群組：Bot 加入群組後，同樣查看 getUpdates

---

## Step 4：上傳至 GitHub

```bash
cd /Users/linyoucheng/.gemini/antigravity/scratch/attendance-pro

git init
git add .
git commit -m "Initial commit: Attendance system"

# 在 GitHub 建立新 repository 後：
git remote add origin https://github.com/YOUR_USERNAME/attendance-pro.git
git branch -M main
git push -u origin main
```

---

## Step 5：部署至 Vercel

1. 前往 [vercel.com](https://vercel.com) 登入
2. 點選 **New Project** → 匯入 GitHub repository
3. Framework 選擇 **Next.js**（會自動偵測）
4. 在 **Environment Variables** 填入以下變數：

| 變數名稱 | 說明 | 範例值 |
|---|---|---|
| `GOOGLE_SHEETS_ID` | Google Sheets 的 Spreadsheet ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服務帳戶 Email | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | 私鑰（含換行符號） | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | `1234567890:ABC...` |
| `ADMIN_PASSWORD` | 後台管理員密碼 | 自訂強密碼 |

5. 點選 **Deploy**

> ⚠️ `GOOGLE_PRIVATE_KEY` 含有換行，請確保貼上原始 JSON 中的值（保留 `\n`）

---

## Step 6：首次設定

1. 開啟已部署的網址 `/admin`
2. 輸入 `ADMIN_PASSWORD` 登入
3. 前往「系統設定」→ 點擊「**初始化 Google Sheets**」（建立所有工作表）
4. 前往「人員維護」→ 新增人員資料
5. 前往「系統設定」→ 設定辦公室的 GPS 座標與簽到半徑

---

## 功能對照表

### 前端頁面（`/`）

| 功能 | 說明 |
|---|---|
| 一般簽到 | GPS 驗證在公司範圍內方可簽到 |
| 外勤簽到 | 不限位置，記錄 GPS 位置 |
| 請假申請 | 必要出席日請假，需待後台審核 |
| 拜訪紀錄 | 記錄拜訪事由、客戶、位置 |
| 紀錄查詢 | 查詢個人近 30 日出席與請假 |

### 後台頁面（`/admin`）

| 功能 | 說明 |
|---|---|
| 總覽 | 今日簽到數、待審假單、功能統計 |
| 人員維護 | 新增/編輯/刪除人員（AGCODE、職級、組別）|
| 出席紀錄 | 篩選、匯出 CSV 出席報表 |
| 拜訪紀錄 | 篩選、匯出 CSV 拜訪報表 |
| 請假審核 | 核准/拒絕請假申請，發送 TG 通知 |
| 必要出席日 | 設定個別或全體的必要出席日與遲到時間 |
| 系統設定 | GPS 座標、初始化工作表 |
| TG 通知設定 | 設定每人的通知訂閱及 Chat ID |

---

## Telegram 通知說明

| 通知類型 | 觸發條件 |
|---|---|
| 新簽到通知 | 任何人完成簽到 |
| 新請假申請 | 人員送出請假申請 |
| 請假結果通知 | 假單審核完成（通知申請者） |
| 新拜訪紀錄 | 人員送出拜訪紀錄 |
| *(預計)* 每週統計 | 由外部排程（Vercel Cron / GAS）觸發 |

---

## 本機開發

```bash
cd attendance-pro
cp .env.example .env.local  # 填入真實的環境變數
npm run dev                  # 開啟 http://localhost:3000
```

---

## Google Sheets 工作表結構

| 工作表 | 欄位 |
|---|---|
| `Members` | AGCODE, Name, Rank, Group, Supervisor, CreatedAt |
| `Attendance` | ID, AGCODE, Name, Type, CheckinTime, Date, IP, Lat, Lng, IsFieldWork, Notes |
| `LeaveRequests` | ID, AGCODE, Name, LeaveDate, Reason, Status, RequestTime, ReviewTime, Reviewer, Notes |
| `VisitRecords` | ID, AGCODE, Name, VisitTime, Date, Purpose, ClientName, Notes, Lat, Lng |
| `Settings` | Key, Value |
| `RequiredDays` | AGCODE, Date, LateThreshold |
| `TGSettings` | AGCODE, ChatId, NotificationTypes, Role |
