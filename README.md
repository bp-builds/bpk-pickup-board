# BP Kids Pickup Board

When the front desk checks a child out in Planning Center Check-Ins, the child's name pops up (with a chime) on that room's tablet. The room volunteer taps **Confirm check out** after sending the child to the front. Admins see every checkout and confirmation for the day on the **Overview** page.

- Event: BP Kids Sunday Morning Worship Experience (Check-Ins event 892503)
- Rooms: Nursery 1, Nursery 2, Sprouts, Stems, Grove (Volunteers and Operations are ignored)
- Updates every 4 seconds. The list resets each day; past days' confirmations stay stored.

## One-time setup

### 1. Put the project on Netlify (pick one)

**Option A: GitHub (no software to install)**
1. Create a free private repository on github.com (for example `bpk-pickup-board`).
2. On the repository page choose **Add file > Upload files** and drag in everything from this folder (`lib`, `netlify`, `public`, `netlify.toml`, `package.json`, `README.md`). Commit.
3. In Netlify: **Add new project > Import an existing project > GitHub**, pick the repository, and accept the defaults (Netlify reads `netlify.toml`). Deploy.

**Option B: Netlify CLI (if Node.js is installed on your computer)**
```
cd bpk-pickup-board
npm install
npx netlify-cli deploy --prod
```

### 2. Add the keys and PINs in Netlify
Netlify project > **Project configuration > Environment variables > Add a variable**. Add these four, with scope including **Functions**:

| Key | Value |
|---|---|
| `PCO_APP_ID` | Planning Center Personal Access Token **Application ID** |
| `PCO_SECRET` | Planning Center Personal Access Token **Secret** (mark as secret) |
| `ROOM_PIN` | A PIN for room tablets, for example 6 digits |
| `ADMIN_PIN` | A different PIN for the Overview page |

Then go to **Deploys > Trigger deploy** so the functions pick up the new values.

The Planning Center token must belong to someone with access to Check-Ins (security codes only come back for Check-Ins editors/admins). Never put the secret in the web page or send it in email or chat.

### 3. Set up each tablet
1. Open your Netlify address (for example `https://bpk-pickup-board.netlify.app`) and tap that room. Bookmark it or add it to the home screen.
2. Tap **Start board** and enter the room PIN. This also turns on the sound, so turn the tablet volume up.
3. Keep the tablet plugged in. The page keeps the screen awake while it's open.

Admins: open the same address, tap **Overview**, and enter the admin PIN.

## Sunday flow
1. The parent shows their security label (or the code in the Church Center app) at the front desk.
2. The desk **checks the child out on the manned station** by scanning or typing the code. This step is required; the board only sees children who've been checked out in Planning Center.
3. The child's name and code pop up on their room's board with a chime.
4. The room volunteer matches the code on the child's name tag, sends the child to the front, and taps **Confirm check out**.
5. The desk matches the name tag to the parent's label and hands the child over.

The Overview page flags in red anyone who has been waiting on a room for 5+ minutes. If someone taps Confirm by mistake, an admin can tap **undo** on the Overview page.

## Branding
- Colors follow the Blueprint brand guidelines: Blueprint Blue #2121F9, Midnight Blue #0A0F2C, True Blue #4351EF, Charcoal #202020, Off-white #DDDDDD.
- **Logo:** add your logo mark as `public/logo.png` (square works best, ideally white on transparent) and redeploy. Until then a "B" shows in the Blueprint Blue tile.
- **Font:** pages use Grift when it's installed on the device, otherwise a clean system font. To force Grift everywhere, add your licensed web-font `<link>` (for example an Adobe Fonts kit) in the `<head>` of `public/index.html`.

## Changing things
- Rooms or Planning Center location IDs: `lib/core.mjs` (`ROOMS`) and the `ROOMS` list near the top of the script in `public/index.html`.
- Refresh speed, the "late" threshold, and the re-chime interval: constants at the top of the script in `public/index.html`.

## How it works
- `netlify/functions/pickups.mjs` (`GET /api/pickups`) reads today's checked-out check-ins for event 892503 from the Planning Center API, maps them to rooms, and merges in confirmations. All boards share one Planning Center request every 3 seconds.
- `netlify/functions/confirm.mjs` (`POST`/`DELETE /api/confirm`) saves or undoes a room confirmation in Netlify Blobs. Only IDs that are real checkouts from today are accepted.
- Planning Center keys stay on the server; tablets only ever see names, rooms, and security codes.
