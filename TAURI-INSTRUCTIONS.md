# 🚀 Tauri Desktop Compilation & Auto-Update Guide (macOS & Windows)

This guide contains everything you need to run, compile, and distribute your **SyncPL Trading Dashboard** as a native desktop application for **macOS** (DMG / APP) and **Windows** (EXE / MSI) using **Tauri**, including automated cloud builds!

We have already pre-configured the cross-platform Tauri configuration and the GitHub Actions release workflow. When you run `git pull` on your local computer, these updates are immediately available.

---

## 📥 Step 0: How to Get These Files Onto Your Mac From AI Studio

Since you are currently developing in the AI Studio environment, here is how you can easily download the source files to your Mac:

### Option A: Download as a ZIP File (Easiest & Fastest)
1. Look at the top-right corner of the **AI Studio** window.
2. Click on the **Gear/Settings Icon** ⚙️.
3. Click **"Download ZIP"** (or **"Export ZIP"**).
4. Save the ZIP file to your Mac, double-click it to unzip, and you'll have all the files ready in a folder!

### Option B: Export / Connect to GitHub
1. Click the **Gear/Settings Icon** ⚙️ in the top-right.
2. Choose **"Export to GitHub"**.
3. Connect your GitHub account and let it push this project into a repository.
4. Once pushed, open the **Terminal** application on your Mac and clone it:
   ```bash
   git clone <your-github-repo-url>
   ```

---

## 💻 1. For Your Mac: Running & Compiling on macOS

Tauri compiles your application directly to native machine code. It uses macOS's built-in Cocoa WebKit renderer, which means the finished app is incredibly lightweight (less than 15MB) and highly responsive.

### Step A: Install macOS Prerequisites
To compile Rust code on your Mac, you need the macOS compiler command-line utilities:

1. **Install Xcode Command Line Tools**:
   Open your Terminal app on your Mac and run:
   ```bash
   xcode-select --install
   ```
   *(A pop-up will appear; click **Install** to let macOS configure the tools automatically.)*

2. **Install Rust Compiler**:
   Install Rust via the official installer:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   *(Choose option `1` when prompted. After installation, restart your terminal or run `source $HOME/.cargo/env` to activate Rust.)*

3. **Install Node.js & NPM**:
   Make sure you have Node.js installed on your Mac (you can download it from [nodejs.org](https://nodejs.org/) or install via Homebrew `brew install node`).

---

### Step B: Sync Your Local Repository & Run Local Dev

1. Open your terminal and navigate to your local workspace folder:
   ```bash
   cd /path/to/your/syncpl-trading-dashboard
   ```
2. Pull latest workspace configurations from GitHub and install development dependencies:
   ```bash
   git pull origin main
   npm install
   ```
3. **Launch Desktop Dev Mode**:
   Test your dashboard in a beautiful native macOS window with full hot-reloads:
   ```bash
   npm run tauri dev
   ```

---

### Step C: Package to Standalone Mac Application (.dmg / .app)
To package your finished application into a native macOS Disk Image installer (`.dmg`) or raw Application bundle (`.app`) on your local Mac:
```bash
npm run tauri build
```
Once completed, your native macOS installers will be ready inside:
* **Standalone App**: `src-tauri/target/release/bundle/macos/SyncPL Trading.app`
* **Disk Image Installer**: `src-tauri/target/release/bundle/dmg/SyncPL Trading_1.0.3_x64.dmg` *(or `_aarch64.dmg` if on Apple Silicon)*

---

## 🪟 2. For Windows: Running & Compiling on Windows

If you or your friends need to compile natively on Windows:

### Step A: Install Windows Prerequisites
1. **Install Rust**: Download and run [rustup-init.exe](https://rustup.rs/) (Choose option `1` to install default toolchain).
2. **Install C++ Build Tools**: Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Run the installer, select the **"Desktop development with C++"** checkbox, and complete the installation.

### Step B: Compile Standalone Windows Installer (.exe)
In your Windows terminal, run:
```bash
npm install
npm run tauri build
```
Your standalone installer will be located at:
`src-tauri/target/release/bundle/nsis/SyncPL Trading_1.0.3_x64-setup.exe`

---

## 🤖 3. Fully Automated macOS & Windows Builds via GitHub Actions

You don't even need to build the apps locally! We have pre-configured a continuous-integration pipeline in `.github/workflows/tauri-build.yml`. 

Whenever you publish a release version, **GitHub's virtual cloud runners will spin up macOS and Windows environments, compile both packages simultaneously in the cloud, and attach the finished macOS `.dmg` and Windows `.exe` installers straight to your release!**

### How to trigger an automatic cross-platform release:

You can do this either via the command line or directly on the GitHub website!

#### Option A: Directly on GitHub.com (No Command Line Needed!)
1. Go to your repository page on **GitHub.com**.
2. On the right side, find the **Releases** section and click on **"Create a new release"** (or click **Releases** then **"Draft a new release"**).
3. Click the **"Choose a tag"** dropdown, type in your new version tag (e.g., `v1.0.4`), and click **"Create new tag"**.
4. Set the Release Title to something like `v1.0.4` or `SyncPL Trading Dashboard v1.0.4`.
5. Click **"Publish release"**.
6. **That's it!** GitHub Actions will instantly start running in the background. It will automatically build both the macOS (`.dmg`) installer and the Windows (`.exe`) installer and attach them directly to this release page in about 10-15 minutes!

#### Option B: Via Local Terminal (Git Command Line)
1. Open `src-tauri/tauri.conf.json` and bump your version (e.g., change `"version": "1.0.3"` to `"1.0.4"`).
2. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "bump version to v1.0.4"
   git push origin main
   ```
3. Tag the commit and push the tag to trigger the automatic pipeline:
   ```bash
   git tag v1.0.4
   git push origin v1.0.4
   ```
4. **Watch the build**: Go to the **Actions** tab on your GitHub repository. You will see both macOS and Windows runners compiling. Once completed, a new Release page will be live on your GitHub repo with both downloads ready for your users!

---

## 🔄 4. Dynamic Cloud Persistence

### How is user data kept safe?
Your desktop app is fully connected to your **Firebase Auth & Firestore database**. Because trade logs, user settings, checklist parameters, and custom market presences are synced to the cloud, users can update the application, change devices, or clean local caches without ever losing their data!

🎉 **Your app is now fully optimized for macOS!** Simply pull the latest updates on your Mac to start running your native macOS desktop app.
