const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require("node:fs");
const childProcess = require("node:child_process");
const ffmpeg = require("fluent-ffmpeg");
require('dotenv').config({ debug: true });


const supportedVideoExt = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'];
const supportedAudioExt = ['mp3', 'm4a', 'ogg', 'wav', 'aac', 'flac', 'wma'];
const userSystemDrive = process.platform === 'win32' ? process.env.SystemDrive + '/' : process.env.SystemDrive;

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    mainWindow.loadFile('index.html');
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
};

function isSupportedMediaFile(filePath) {
    let fileExtension = path.extname(filePath).split(".")[1];
    // let fileExtension = filePath.split(".")[1];
    if (supportedVideoExt.includes(fileExtension)) {
        return 'video';
    }
    if (supportedAudioExt.includes(fileExtension)) {
        return 'audio';
    }
    return false;
}

function isFolderOrFile(parentFolder, fileOrFolderPath) {
    try {
        let absolutePath = path.join(parentFolder, fileOrFolderPath);
        let pathStatus = fs.statSync(absolutePath);
        let isFolder = pathStatus.isDirectory();
        let isFile = pathStatus.isFile();
        if (isFolder) {
            return {
                type: 'folder',
                subType: null,
                name: fileOrFolderPath,
                path: absolutePath
            };
        }
        if (isFile) {
            let mediaFileType = isSupportedMediaFile(absolutePath);
            if (mediaFileType) {
                return {
                    type: 'file',
                    subType: mediaFileType,
                    name: fileOrFolderPath,
                    path: absolutePath
                };
            }
        }
    } catch (error) {

    }
}

// folder or file sorting compare function
function logicalCompare(a, b) {
    const re = /(\d+)|(\D+)/g;
    function tokenize(str) {
        return str.match(re).map(token => {
            return isNaN(token) ? token : parseInt(token, 10);
        });
    }
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    for (let i = 0; i < Math.max(tokensA.length, tokensB.length); i++) {
        const tokenA = tokensA[i] || '';
        const tokenB = tokensB[i] || '';

        if (typeof tokenA === 'number' && typeof tokenB === 'number') {
            if (tokenA !== tokenB) return tokenA - tokenB;
        } else if (typeof tokenA === 'string' && typeof tokenB === 'string') {
            return tokenA.toLowerCase() < tokenB.toLowerCase() ? -1 : 1;
        } else if (tokenA !== tokenB) {
            return tokenA < tokenB ? -1 : 1;
        }
    }
    return 0;
}

function getDirectoryInfo(folderPath) {
    try {
        let directoryContents = fs.readdirSync(path.resolve(folderPath));
        let filteredDirectoryContents = directoryContents.map(content => {
            return isFolderOrFile(folderPath, content);
        }).filter(ele => ele !== undefined).sort((a, b) => logicalCompare(a.name, b.name));
        if (path.resolve(folderPath) === path.resolve(path.dirname(folderPath))) {
            filteredDirectoryContents.unshift({
                type: 'folder',
                subType: 'driveList',
                name: '>'
            });
        } else {
            filteredDirectoryContents.unshift({
                type: 'folder',
                subType: null,
                name: '..',
                path: path.join(folderPath, "..")
            });
        }
        return filteredDirectoryContents;
    } catch (error) {
        console.log(error.message);
    }
}

function getDriveInfo() {
    let userDevice = process.platform;
    switch (userDevice) {
        case 'win32': {
            let driveInfo = childProcess.execSync("wmic logicaldisk get name");
            let allDrives = driveInfo.toString("utf8").replaceAll('\r\r\n', '').split(" ").filter(value => {
                return value !== '';
            });
            allDrives.shift();
            if (allDrives.length) {
                return allDrives.map(drive => {
                    return {
                        name: drive,
                        path: drive + '/'
                    };
                });
            }
            break;
        };
        case 'linux': {
            let driveInfo = childProcess.execSync("df -h");
            break;
        };
        case 'darwin': {

        }
        default:
            break;
    }
}

function extractMetadata() {
    let filePath = path.join(__dirname, './assets/video.mkv');
    ffmpeg.ffprobe(filePath, (err, metaData) => {
        if (!err) {
            const subtitleStream = metaData.streams.filter(stream => stream.codec_type === 'subtitle');
            console.log(subtitleStream);
            subtitleStream.forEach(subtitle => {
                ffmpeg(filePath)
                    .outputOptions([`-map 0:s:${subtitle.index}?`, '-c:s webvtt'])
                    .output(`./assets/subtitle/${subtitle.tags.title}.vtt`)
                    .on('end', () => {
                        console.log(`Subtitles have been extracted to ${subtitle.tags.title}.vtt`);
                        // let fileBuffer = fs.readFileSync(`./assets/subtitle/${subtitle.tags.title}.vtt`);
                        // fs.writeFileSync(`./assets/subtitle/${subtitle.tags.title}utf.vtt`, Buffer.from(fileBuffer, 'binary').toString('utf8'));
                    })
                    .on('error', (err) => {
                        console.error('Error extracting subtitles:', err);
                    })
                    .run();

            });
        }
        else {
            console.log(err);
        }
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // extractMetadata();
    ipcMain.handle("choose_video", async (event) => {
        let { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'media', extensions: [...supportedVideoExt, ...supportedAudioExt] },
            ]
        });
        if (!canceled) {
            return filePaths.length ? { path: filePaths[0], name: path.basename(filePaths[0]) } : false;
        } else {
            return false;
        }
    });

    ipcMain.handle("get_home_drive", (event) => {
        let allDrives = getDriveInfo();
        return { type: 'drive', drives: allDrives };
    });

    ipcMain.handle("get_directory_info", (event, currentPath) => {
        return getDirectoryInfo(currentPath);
    });

    ipcMain.handle("get_current_playlist", (event, filePath) => {
        let parentDir = path.dirname(filePath);
        return getDirectoryInfo(parentDir).filter(ele => ele.type !== 'folder');
    });

    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
