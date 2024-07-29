const videoPlayerContainerNode = document.querySelector(".video_player_container");
const videoPlayer = document.getElementById("videoPlayer");
const videoPlayerControlPanel = document.querySelector(".video_player_control_container");
const progressBarNode = document.querySelector(".progress_bar");
const progressBarContainerNode = document.querySelector(".progressbar_container");
const volumeControlContainerNode = document.querySelector(".volume_control");
const volumeControlInputNode = document.querySelector(".volume_control input");
const playlistPanelNode = document.querySelector(".playlist_items_container");
const openPlaylistBtn = document.querySelector(".browse_media_file");
const playlistPanelCloseBtnNode = document.querySelector(".close_btn");
const playPauseNode = document.querySelector(".play_pause");
const playPauseBtnNode = document.querySelector(".play_pause_btn img");
const openFileContainerNode = document.querySelector(".open_file_container");
const browseFilesBtnNode = document.querySelector(".browse_files");
const currentPlaylistBtnNode = document.querySelector(".current_playlist");
const browseContentListNode = document.querySelector(".browse_content_list");
const browseContentListItemNode = document.querySelector(".browse_content_list ul");
const currentPlayListNode = document.querySelector(".current_playlist_items");
const currentPlayListItemsNode = document.querySelector(".current_playlist_items ul");

let currentActivePlaylistItem = null;
let browseFileListItem = null;
let totalCurrentPlaylistItem = 0;
let currentActivePlaylistItemIndex = 0;

const audioFileIconPath = "./assets/icons/audio_file.svg";
const videoFileIconPath = "./assets/icons/video_file.svg";
const folderIconPath = "./assets/icons/folder.svg";


function handelVolume() {
    videoPlayer.volume = volumeControlInputNode.value = '' || 0.75;
    volumeControlInputNode.addEventListener("input", (event) => {
        videoPlayer.volume = window.Number.parseFloat(event.target.value);
    });
}

function handelVolumeControlBtn() {
    volumeControlContainerNode.addEventListener("mouseover", () => {
        volumeControlInputNode.style.display = 'block';
    });
    volumeControlContainerNode.addEventListener("mouseleave", () => {
        volumeControlInputNode.style.display = 'none';
    });
}

function handelPlaylistPanel() {
    openPlaylistBtn.addEventListener("click", () => {
        playlistPanelNode.style.display = "block";
    });
    playlistPanelNode.addEventListener("mouseleave", () => {
        playlistPanelNode.style.display = "none";
    });
    // videoPlayerContainerNode.addEventListener("click", () => {
    //     if (playlistPanelNode.style.display === "block") {
    //         playlistPanelNode.style.display = "none";
    //     }
    // });
}

function handelPlayPause() {
    let timeoutId = null;
    playPauseNode.addEventListener("click", async () => {
        if (videoPlayer.paused) {
            await videoPlayer.play();
            playPauseBtnNode.src = './assets/icons/pause_circle.svg';
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                videoPlayerControlPanel.style.visibility = "hidden";
            }, 3000);
        } else {
            await videoPlayer.pause();
            playPauseBtnNode.src = './assets/icons/play_circle.svg';
        }
    });
}

function handelFileOpen() {
    openFileContainerNode.addEventListener("click", async () => {
        let chosenVideoPath = await window.electronAPI.chooseVideo();
        if (chosenVideoPath) {
            videoPlayer.src = chosenVideoPath;
            await videoPlayer.play();
            playPauseBtnNode.src = './assets/icons/pause_circle.svg';
        }
    });
}

function handelProgressBarUpdate() {
    videoPlayer.addEventListener("timeupdate", async () => {
        progressBarNode.style.width = (videoPlayer.currentTime / videoPlayer.duration) * 100 + '%';
        if (videoPlayer.currentTime === videoPlayer.duration && totalCurrentPlaylistItem > 1 && currentActivePlaylistItemIndex < totalCurrentPlaylistItem) {
            currentActivePlaylistItemIndex += 1;
            await handelNextPlaylistItemPlay(currentActivePlaylistItemIndex);
        }
        if (videoPlayer.currentTime === videoPlayer.duration && (totalCurrentPlaylistItem <= 1 || currentActivePlaylistItemIndex === totalCurrentPlaylistItem)) {
            playPauseBtnNode.src = './assets/icons/play_circle.svg';
            progressBarNode.style.width = `0%`;
            await videoPlayer.pause();
        }
    });
}

function seekListener(event) {
    let progressBarWidth = progressBarContainerNode.clientWidth;
    progressBarNode.style.width = `${event.offsetX}px`;
    videoPlayer.currentTime = (event.offsetX / progressBarWidth) * videoPlayer.duration;
}

function handelVideoSeek() {
    progressBarContainerNode.addEventListener("click", seekListener);
    progressBarContainerNode.addEventListener("mousedown", () => {
        progressBarContainerNode.addEventListener("mousemove", seekListener);
    });
    document.addEventListener("mouseup", () => {
        progressBarContainerNode.removeEventListener("mousemove", seekListener);
    });
}

function handelControlPanelVisibility() {
    let timeoutId = null;
    let isPointerOnControlPanel = false;
    videoPlayerContainerNode.addEventListener("mousemove", () => {
        videoPlayerContainerNode.style.cursor = "default";
        videoPlayerControlPanel.style.visibility = "visible";
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            if (!videoPlayer.paused && !isPointerOnControlPanel) {
                videoPlayerContainerNode.style.cursor = "none";
                videoPlayerControlPanel.style.visibility = "hidden";
                // playlistPanelNode.style.display = "none";
            }
        }, 3000);
    });
    videoPlayerControlPanel.addEventListener("mousemove", (event) => {
        isPointerOnControlPanel = true;
    });
    videoPlayerControlPanel.addEventListener("mouseleave", (event) => {
        isPointerOnControlPanel = false;
    });
}

async function handelNextPlaylistItemPlay(nextPlaylistItemIndex) {
    currentActivePlaylistItem.classList.remove("active_playlist_file");
    currentActivePlaylistItem = currentPlayListItemsNode.childNodes[nextPlaylistItemIndex];
    videoPlayer.src = currentActivePlaylistItem.dataset.path;
    await videoPlayer.play();
    playPauseBtnNode.src = './assets/icons/pause_circle.svg';
    currentActivePlaylistItem.classList.add("active_playlist_file");
}

async function handelCurrentPlaylist(filePath) {
    let playlistContentItems = "";
    let playListInfo = await window.electronAPI.getCurrentPlayList(filePath);
    totalCurrentPlaylistItem = playListInfo.length - 1 || 0;
    currentPlayListItemsNode.innerHTML = "";
    playListInfo.forEach(file => {
        playlistContentItems += `<li class="drive_path" data-name="${file.name}" data-path="${file.path}" data-type="${file.type}" data-subtype="${file.subType}"><img src="${file.subType === 'audio' ? audioFileIconPath : videoFileIconPath}"><span>${file.name}</span></li>`;
    });
    currentPlayListItemsNode.innerHTML = playlistContentItems;
    currentPlayListItemsNode.childNodes.forEach((listItem, index) => {
        let { name } = listItem.childNodes[0].parentElement.dataset;
        if (name === browseFileListItem.dataset.name) {
            listItem.childNodes[0].parentElement.classList.add("active_playlist_file");
            currentActivePlaylistItem = listItem.childNodes[0].parentElement;
            currentActivePlaylistItemIndex = index;
        }
        // console.log(listItem.childNodes[0].parentElement.classList);
        // console.log(currentActivePlaylistItem);
        listItem.addEventListener("click", async (event) => {
            let type = event.currentTarget.dataset.type;
            let subType = event.currentTarget.dataset.subtype;
            let currentPath = event.currentTarget.dataset.path;
            currentActivePlaylistItem.classList.remove("active_playlist_file");
            currentActivePlaylistItem = event.target.parentElement;
            if (event.target.parentElement.textContent === currentActivePlaylistItem.dataset.name) {
                currentActivePlaylistItem.classList.add("active_playlist_file");
                currentActivePlaylistItemIndex = index;
            };
            videoPlayer.src = currentPath;
            await videoPlayer.play();
            playPauseBtnNode.src = './assets/icons/pause_circle.svg';
        });
    });
}

async function handelBrowse(currentPath) {
    let browseContentListItems = "";
    let directoryInfo = await window.electronAPI.getDirectoryInfo(currentPath);
    browseContentListItemNode.innerHTML = "";
    directoryInfo.forEach(file => {
        browseContentListItems += `<li class="drive_path" data-name="${file.name}" data-path="${file.path}" data-type="${file.type}" data-subtype="${file.subType}"><img src="${file.type === 'folder' ? folderIconPath : file.subType === 'audio' ? audioFileIconPath : videoFileIconPath}"><span>${file.name}</span></li>`;
    });
    browseContentListItemNode.innerHTML = browseContentListItems;
    browseContentListItemNode.childNodes.forEach(childNode => {
        childNode.addEventListener("click", async (event) => {
            let type = event.currentTarget.dataset.type;
            let subType = event.currentTarget.dataset.subtype;
            let currentPath = event.currentTarget.dataset.path;
            if (subType === 'HomeDrive' && type === "folder") {
                loadDriveInfo();
            } else if (type === 'folder') {
                await handelBrowse(currentPath);
            } else {
                videoPlayer.src = currentPath;
                await videoPlayer.play();
                playPauseBtnNode.src = './assets/icons/pause_circle.svg';
                browseFileListItem = event.target.parentElement;
                await handelCurrentPlaylist(currentPath);
            }
            // event.preventDefault();
        });
    });
}

function loadDriveInfo() {
    let driveIconPath = "./assets/icons/hard_drive.svg";
    let browseContentListItems = "";
    browseContentListItemNode.innerHTML = "";
    window.electronAPI.getHomeDrive().then(driveObj => {
        browseContentListItems += `<li class="drive_path">
            <span><img src="${driveIconPath}"></span>
            <span>${driveObj.path}</span> 
        </li>`;
        browseContentListItemNode.innerHTML = browseContentListItems;
        browseContentListItemNode.childNodes.forEach(childNode => {
            childNode.addEventListener("click", async () => {
                await handelBrowse(driveObj.path);
            });
        });
    });
}

function loadPlaylistNavigation() {
    browseFilesBtnNode.addEventListener("click", () => {
        browseContentListNode.style.display = "block";
        currentPlayListNode.style.display = "none";
    });
    currentPlaylistBtnNode.addEventListener("click", () => {
        browseContentListNode.style.display = "none";
        currentPlayListNode.style.display = "block";
    });
}

function main() {
    handelVolumeControlBtn();
    handelPlaylistPanel();
    handelPlayPause();
    handelFileOpen();
    handelProgressBarUpdate();
    handelVideoSeek();
    handelVolume();
    handelControlPanelVisibility();
    loadDriveInfo();
    loadPlaylistNavigation();
}

main();
console.log(window.electronAPI);
