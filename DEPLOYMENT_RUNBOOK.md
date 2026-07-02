# Pricing Template Studio Deployment Runbook

This document is the release and handoff guide for this project. Follow it when pushing code, deploying to Netlify, and closing work on production.

## 1. Project Targets

- Local workspace: `C:\Users\ADMIN\Desktop\Studio rateoil`
- GitHub repo: `https://github.com/awiruttangwong/Pricing-Template-Studio`
- Production site name: `pricing-template-studio`
- Production site URL: `https://pricing-template-studio.netlify.app/`
- Netlify owner team: `info-inn-wvk’s team`
- Netlify site ID: `3207a746-246b-452f-8812-0d38f06ee942`

## 2. Known Constraints

- PowerShell on this machine may block `npm.ps1`.
  Use `node scripts/build-static.mjs` instead of `npm run build` when needed.
- Git credentials and Netlify credentials may belong to different accounts.
  Verify both before attempting release.
- Manual zip deploys from Windows can break asset paths if the zip stores backslashes.
  If assets load as `404`, suspect incorrect zip entry paths first.

## 3. Definition Of Done

A release is not closed until all items below are true:

1. Local build succeeds.
2. GitHub target repo contains the intended commit.
3. Netlify production points to the intended deploy.
4. Root page returns `200`.
5. Main CSS and JS assets return `200`.
6. Page renders visually and core flows work:
   - client selector loads
   - route list appears
   - preview canvas renders
   - export buttons respond

## 4. Standard Release Flow

### 4.1 Inspect repo state

Run:

```powershell
git status --short --branch
git remote -v
git rev-parse HEAD
```

Expected:

- branch is `main`
- remote points to `awiruttangwong/Pricing-Template-Studio`
- no unexpected local changes before release

### 4.2 Build production files

Preferred command on this machine:

```powershell
node scripts/build-static.mjs
```

Expected output:

- `Built static site into ...\dist`

Sanity check:

```powershell
Get-ChildItem dist -Recurse
```

`dist` must contain:

- `index.html`
- `assets\css\styles.css`
- `icons\...`
- `scripts\app.js`
- `scripts\client-datasets.js`
- `scripts\data-store.js`
- `scripts\pricing-engine.js`
- `scripts\image-renderer.js`
- `scripts\ui-shell.js`

### 4.3 Syntax check JavaScript

Run:

```powershell
cmd /c node --check scripts\client-datasets.js
cmd /c node --check scripts\data-store.js
cmd /c node --check scripts\pricing-engine.js
cmd /c node --check scripts\image-renderer.js
cmd /c node --check scripts\ui-shell.js
cmd /c node --check scripts\app.js
```

All files must pass.

### 4.4 Push to GitHub

Run:

```powershell
git push origin main
```

If push fails with `403`:

- the active git credential does not have write access
- do not assume the repo is stale
- verify remote HEAD first:

```powershell
git ls-remote --heads origin
```

If the returned SHA already matches local `git rev-parse HEAD`, GitHub already has the latest code and only the credential is wrong.

## 5. Netlify Authentication Checks

Before deploy, identify which account has access to the production site.

Useful checks:

```powershell
cmd /c netlify status
cmd /c netlify api listAccountsForUser
cmd /c netlify api listSites
```

Important:

- `awiruttangwong’s team` is not the production owner for this site
- production site `pricing-template-studio` belongs to `info-inn-wvk’s team`
- if CLI sees the wrong account, deploy may fail with `Project not found` or `Forbidden`

Do not commit or print tokens into repo files.

## 6. Preferred Netlify Deploy Path

If the correct Netlify account is active and CLI deploy works, use:

```powershell
cmd /c netlify deploy --prod --dir=dist --site=3207a746-246b-452f-8812-0d38f06ee942
```

If this succeeds, verify production immediately.

## 7. Fallback Deploy Path For This Machine

Use this when:

- Netlify CLI account selection is wrong
- `netlify deploy` fails with `Project not found`
- `netlify deploy` fails with `Forbidden`
- you must deploy using the owner token directly

### 7.1 Read the correct Netlify token from local CLI config

The owner token may exist in:

```text
C:\Users\ADMIN\AppData\Roaming\netlify\Config\config.json
```

Use the token for the `2K logistic` user if production belongs to `info-inn-wvk’s team`.

Never copy that token into committed files.

### 7.2 Do not use `Compress-Archive` for manual production zip deploys

Reason:

- Windows zip entries can be stored as `scripts\\app.js`
- Netlify then serves the wrong paths
- result: `index.html` loads, but CSS/JS assets return `404`

### 7.3 Create a zip with forward-slash entry paths

Use this PowerShell pattern:

```powershell
if (Test-Path '.deploy-dist-unix.zip') { Remove-Item -LiteralPath '.deploy-dist-unix.zip' -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = (Resolve-Path '.').Path + '\.deploy-dist-unix.zip'
$distPath = (Resolve-Path 'dist').Path
$prefixLen = $distPath.Length + 1
$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
try {
  $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    Get-ChildItem 'dist' -Recurse -File | ForEach-Object {
      $relative = $_.FullName.Substring($prefixLen).Replace('\','/')
      $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      try {
        $fileStream = [System.IO.File]::OpenRead($_.FullName)
        try { $fileStream.CopyTo($entryStream) } finally { $fileStream.Dispose() }
      } finally { $entryStream.Dispose() }
    }
  } finally { $zip.Dispose() }
} finally { $fs.Dispose() }
```

### 7.4 Upload zip to Netlify API

Pattern:

```powershell
$cfg = Get-Content "$env:APPDATA\netlify\Config\config.json" | ConvertFrom-Json
$token = $cfg.users.'6a06de527793ac208f270ace'.auth.token
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/zip' }
Invoke-RestMethod -Headers $headers `
  -Uri 'https://api.netlify.com/api/v1/sites/3207a746-246b-452f-8812-0d38f06ee942/deploys' `
  -Method Post `
  -InFile '.deploy-dist-unix.zip'
```

Then poll deploy status:

```powershell
$deployId = '<DEPLOY_ID>'
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } `
  -Uri "https://api.netlify.com/api/v1/deploys/$deployId" `
  -Method Get
```

Release is live when deploy `state` becomes `ready`.

## 8. Post-Deploy Verification

### 8.1 Verify production points to the latest deploy

```powershell
$cfg = Get-Content "$env:APPDATA\netlify\Config\config.json" | ConvertFrom-Json
$token = $cfg.users.'6a06de527793ac208f270ace'.auth.token
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Headers $headers `
  -Uri 'https://api.netlify.com/api/v1/sites/3207a746-246b-452f-8812-0d38f06ee942' `
  -Method Get
```

Check:

- `published_deploy.id`
- `published_deploy.published_at`
- `ssl_url`

### 8.2 Verify page and asset URLs

Root page:

```powershell
Invoke-WebRequest -Uri 'https://pricing-template-studio.netlify.app/' -UseBasicParsing
```

Assets:

```powershell
Invoke-WebRequest -Uri 'https://pricing-template-studio.netlify.app/assets/css/styles.css?v=20260701-1' -UseBasicParsing
Invoke-WebRequest -Uri 'https://pricing-template-studio.netlify.app/scripts/app.js?v=20260701-2' -UseBasicParsing
Invoke-WebRequest -Uri 'https://pricing-template-studio.netlify.app/scripts/data-store.js?v=20260701-1' -UseBasicParsing
```

Expected:

- all return `200`

If `index.html` is `200` but assets are `404`:

- deployment packaging is wrong
- redeploy with forward-slash zip entries
- do not keep debugging frontend logic until asset delivery is fixed

### 8.3 UI smoke checklist

Open the live site and confirm:

1. layout renders correctly
2. branding and header appear
3. client selector is populated
4. route list is populated
5. preview canvas is visible
6. `Refresh`, `Export PNG`, and `Export ทั้งหมด` buttons appear
7. popups open and close normally

## 9. Common Failure Modes

### GitHub push fails with `403`

Meaning:

- wrong git account
- repo may still already be up to date

Action:

1. compare local SHA with `git ls-remote`
2. if equal, do not block release on push
3. fix credentials later

### Netlify `Project not found`

Meaning:

- wrong Netlify account or wrong local linkage

Action:

1. check active account with `netlify status`
2. check owner team with `listAccountsForUser`
3. use owner token and API fallback if needed

### Netlify `Forbidden`

Meaning:

- active token can see the site partially or not enough to deploy

Action:

1. switch to the owner token
2. use direct API deploy

### Frontend looks blank after deploy

Meaning:

- first suspect asset path failure, not app logic

Action:

1. open root page
2. open one CSS file URL
3. open one JS file URL
4. if assets are `404`, rebuild and redeploy with correct zip path format

## 10. Release Close-Out Template

Use this structure when closing a deployment task:

```text
1. Local build status
2. GitHub commit SHA and whether origin matches
3. Netlify site name, site ID, deploy ID
4. Production URL
5. Root page status
6. Asset status
7. Remaining risk, if any
```

## 11. Minimum Evidence Required Before Saying "Done"

Do not say the job is fully closed unless you have all of these:

- successful build
- intended commit identified
- production deploy ID recorded
- production URL verified
- asset URLs verified
- at least one quick UI smoke pass

## 12. Cleanup

Delete temporary release artifacts after deployment:

- `.deploy-dist.zip`
- `.deploy-dist-unix.zip`
- temporary HTML dumps
- temporary screenshots

Do not leave ad hoc deploy artifacts in the repo root.
