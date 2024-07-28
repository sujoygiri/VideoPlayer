const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    chooseVideo: () => ipcRenderer.invoke('choose_video'),
    getHomeDrive: () => ipcRenderer.invoke('get_home_drive'),
    getDirectoryInfo: (currentPath) => ipcRenderer.invoke('get_directory_info', currentPath),
    getCurrentPlayList: (filePath) => ipcRenderer.invoke("get_current_playlist", filePath)
});


