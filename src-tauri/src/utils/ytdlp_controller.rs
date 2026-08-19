use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

// const REPO_API: &str = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
// using nightly channel as temp workaround
const REPO_API: &str = "https://api.github.com/repos/yt-dlp/yt-dlp-nightly-builds/releases/latest";
const USER_AGENT: &str = "tamaureus-app";
const CHECKSUMS_ASSET_NAME: &str = "SHA2-256SUMS";

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct UpdateStatus {
    pub current_version: Option<String>,
    pub latest_version: String,
    pub needs_update: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

// name of the asset to fetch, based on target platform
fn asset_name() -> &'static str {
    #[cfg(target_os = "windows")]
    { "yt-dlp.exe" }

    #[cfg(target_os = "macos")]
    { "yt-dlp_macos" }

    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    { "yt-dlp_linux" }

    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    { "yt-dlp_linux_aarch64" }
}

// filename the binary is stored as locally
fn local_binary_name() -> &'static str {
    #[cfg(target_os = "windows")]
    { "yt-dlp.exe" }

    #[cfg(not(target_os = "windows"))]
    { "yt-dlp" }
}

fn ytdlp_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("yt-dlp");
    Ok(dir)
}

pub fn ytdlp_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(ytdlp_dir(app)?.join(local_binary_name()))
}

fn version_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(ytdlp_dir(app)?.join("version.txt"))
}

pub fn installed_version(app: &AppHandle) -> Option<String> {
    let path = version_file_path(app).ok()?;
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

async fn fetch_latest_release() -> Result<GithubRelease, String> {
    let client = reqwest::Client::new();
    let res = client
        .get(REPO_API)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("github api returned status {}", res.status()));
    }

    res.json::<GithubRelease>().await.map_err(|e| e.to_string())
}

// downloads the SHA2-256SUMS asset and extracts the expected hash for our platform's binary
async fn fetch_expected_hash(release: &GithubRelease) -> Result<String, String> {
    let checksums_asset = release
        .assets
        .iter()
        .find(|a| a.name == CHECKSUMS_ASSET_NAME)
        .ok_or_else(|| "no SHA2-256SUMS asset found in release".to_string())?;

    let client = reqwest::Client::new();
    let text = client
        .get(&checksums_asset.browser_download_url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    // each line looks like: "<hex hash>  <filename>"
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        let hash = parts.next();
        let filename = parts.next();

        if let (Some(hash), Some(filename)) = (hash, filename) {
            if filename == asset_name() {
                return Ok(hash.to_lowercase());
            }
        }
    }

    Err(format!(
        "no checksum entry found for asset: {}",
        asset_name()
    ))
}

async fn hash_file(path: &PathBuf) -> Result<String, String> {
    let bytes = tokio::fs::read(path).await.map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let digest = hasher.finalize();
    Ok(hex::encode(digest))
}

#[tauri::command]
pub async fn check_ytdlp_update(app: AppHandle) -> Result<UpdateStatus, String> {
    let release = fetch_latest_release().await?;
    let current = installed_version(&app);
    let needs_update = current.as_deref() != Some(release.tag_name.as_str());

    Ok(UpdateStatus {
        current_version: current,
        latest_version: release.tag_name,
        needs_update,
    })
}

// ---- commands ----

#[tauri::command]
pub async fn download_ytdlp(app: AppHandle) -> Result<String, String> {
    let release = fetch_latest_release().await?;

    let asset = release
        .assets
        .iter()
        .find(|a| a.name == asset_name())
        .ok_or_else(|| format!("no asset found for platform: {}", asset_name()))?;

    let expected_hash = fetch_expected_hash(&release).await?;

    let dir = ytdlp_dir(&app)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())?;

    let binary_path = ytdlp_binary_path(&app)?;
    let tmp_path = binary_path.with_extension("tmp");

    let client = reqwest::Client::new();
    let res = client
        .get(&asset.browser_download_url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let total = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let _ = app.emit(
            "ytdlp-download-progress",
            DownloadProgress { downloaded, total },
        );
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    // verify integrity before this file is ever treated as trusted/executable
    let actual_hash = hash_file(&tmp_path).await?;
    if actual_hash != expected_hash {
        let _ = tokio::fs::remove_file(&tmp_path).await;
        return Err(format!(
            "checksum mismatch: expected {}, got {}. download aborted.",
            expected_hash, actual_hash
        ));
    }

    tokio::fs::rename(&tmp_path, &binary_path)
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = tokio::fs::metadata(&binary_path)
            .await
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        tokio::fs::set_permissions(&binary_path, perms)
            .await
            .map_err(|e| e.to_string())?;
    }

    tokio::fs::write(version_file_path(&app)?, &release.tag_name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(release.tag_name)
}

#[tauri::command]
pub fn get_ytdlp_status(app: AppHandle) -> Result<Option<String>, String> {
    let path = ytdlp_binary_path(&app)?;
    if path.exists() {
        Ok(installed_version(&app))
    } else {
        Ok(None)
    }
}