/*
* https://script.google.com/home
* https://developers.google.com/apps-script/reference/drive/drive-app
* https://script.google.com/macros/s/xxxxx/exec?
*
* */

function doGet(e) {
    let tempFolder, tempFolderName = "temp-fdindex-folder-for-zipping";
    try {
        let tempFolders = DriveApp.getFoldersByName(tempFolderName);
        if (tempFolders.hasNext()) tempFolder = tempFolders.next();
        if (!tempFolder) throw new Error(`Cannot find folder with name '${tempFolderName}'`);
    } catch (er) {
        try {
            tempFolder = DriveApp.createFolder(tempFolderName);
        } catch (er) {
            return ContentService.createTextOutput(JSON.stringify({
                "status": -1, "error": er.toString(),
            }));
        }
    }
    let folderId = e?.parameter?.folderId;
    // if (!folderId) folderId = "";
    let folder = DriveApp.getFolderById(folderId);
    let datePart = `${formatTimestamp(Date.now() / 1000, "YYYY-MM-DD_HH-mm").slice(0, -1) + "0"}`;
    let zipfileName = `${folder.getId()}_${datePart}.zip`;
    let accessToken = ScriptApp.getOAuthToken();
    try {
        let folderModifiedTime = getModifiedTime(folder, accessToken);

        let existFiles = tempFolder.getFiles();
        while (existFiles.hasNext()) {
            let existFile = existFiles.next();
            if (existFile.isTrashed()) continue;
            let existFileModifiedTime = existFile.getLastUpdated();
            if (new Date() - existFileModifiedTime > 1 * 20 * 60 * 60 * 1000) {
                // existFile.setTrashed(true);
                console.log("删除缓存", existFile.getName())
                try {
                    deleteForever(existFile, accessToken);
                } catch (er) {
                    console.log("删除失败", er, er.toString());
                    throw er;
                }
                console.log("删除成功",)
            }
        }

        existFiles = tempFolder.getFilesByName(zipfileName);
        while (existFiles.hasNext()) {
            let existFile = existFiles.next();
            if (existFile.isTrashed()) continue;
            let existFileModifiedTime = existFile.getLastUpdated();
            // console.log(folderModifiedTime, existFileModifiedTime, folderModifiedTime.getTime() > existFileModifiedTime.getTime())
            if (folderModifiedTime.getTime() > existFileModifiedTime.getTime()) {
                // existFile.setTrashed(true);
                console.log("删除缓存", existFile.getName())
                try {
                    deleteForever(existFile, accessToken);
                } catch (er) {
                    console.log("删除失败", er, er.toString());
                    throw er;
                }
                console.log("删除成功",)
            }
        }
        existFiles = tempFolder.getFilesByName(zipfileName);
        if (existFiles.hasNext()) {
            let existFile = existFiles.next();
            console.log("读取缓存", existFile.getName(),)
            return ContentService.createTextOutput(JSON.stringify({
                "status": 0, "id": existFile.getId(), datePart,
            }));
        }
    } catch (er) {
        return ContentService.createTextOutput(JSON.stringify({
            "status": -1, "error": er.toString(),
        }));
    }

    let file = DriveApp.getFileById(folderId);
    if (file.getMimeType() === "application/vnd.google-apps.shortcut") {
        if (file.getTargetMimeType() === "application/vnd.google-apps.folder") {
            let target = DriveApp.getFolderById(file.getTargetId());
            target._shortcut_name = folder.getName();
            folder = target;
        }
    }

    console.log("开始打包", zipfileName,)
    return ContentService.createTextOutput(JSON.stringify({
        "status": 0, "id": zipping(folder, tempFolder, zipfileName, accessToken,), datePart,
    }));
}

function zipping(folder, rootFolder, zipfileName, accessToken) {
    let blobs = [];

    let count = 0, existNames = [];
    let path = [folder._shortcut_name ? folder._shortcut_name : folder.getName(),];
    let idpaths = [folder.getId(),];
    let files = folder.getFiles();
    let folders = folder.getFolders();
    while (files.hasNext()) {
        count++;
        let file = files.next();
        if (file.getMimeType() === "application/vnd.google-apps.shortcut") {
            if (file.getTargetMimeType() === "application/vnd.google-apps.folder") {
                let target = DriveApp.getFolderById(file.getTargetId());
                target._shortcut_name = file.getName();
                getItems(path, createIteratorWithHasNext([target,]), existNames, blobs, accessToken, [...idpaths,],);
            } else {
                let target = DriveApp.getFileById(file.getTargetId());
                target._shortcut_name = file.getName();
                blobs.push(getBlob([...path,], target, existNames, accessToken));
            }
        } else {
            blobs.push(getBlob([...path,], file, existNames, accessToken));
        }
    }
    count += getItems(path, folders, existNames, blobs, accessToken, [...idpaths,],);

    if (count === 0) {
        let blob = Utilities.newBlob("");
        blob.setName(path.join("/") + "/");
        blobs.push(blob);
    }

    let zip = Utilities.zip(blobs, zipfileName);
    return rootFolder.createFile(zip).getId();
}

function getItems(path, folders, existNames, blobs, accessToken, idpaths,) {
    let count = 0;
    while (folders.hasNext()) {
        let folder = folders.next();
        if (idpaths.includes(folder.getId())) {
            continue;
        }
        count++;
        let subCount = 0, subExistNames = [];
        let folderName = folder._shortcut_name ? folder._shortcut_name : folder.getName(), index = 1;
        while (existNames.indexOf(folderName) !== -1) {
            folderName = `${folder._shortcut_name ? folder._shortcut_name : folder.getName()}（重名${index}）`;
            index++;
        }
        existNames.push(folderName);
        let currPath = [...path, folderName,];
        let currIdpaths = [...idpaths, folder.getId(),];
        let files = folder.getFiles();
        let subFolders = folder.getFolders();
        while (files.hasNext()) {
            subCount++;
            let file = files.next();
            if (file.getMimeType() === "application/vnd.google-apps.shortcut") {
                if (file.getTargetMimeType() === "application/vnd.google-apps.folder") {
                    let target = DriveApp.getFolderById(file.getTargetId());
                    target._shortcut_name = file.getName();
                    getItems(currPath, createIteratorWithHasNext([target,]), subExistNames, blobs, accessToken, currIdpaths);
                } else {
                    let target = DriveApp.getFileById(file.getTargetId());
                    target._shortcut_name = file.getName();
                    blobs.push(getBlob([...currPath,], target, subExistNames, accessToken));
                }
            } else {
                blobs.push(getBlob([...currPath,], file, subExistNames, accessToken));
            }
        }
        subCount += getItems(currPath, subFolders, subExistNames, blobs, accessToken, currIdpaths);
        if (subCount === 0) {
            let blob = Utilities.newBlob("");
            blob.setName(currPath.join("/") + "/");
            blobs.push(blob);
        }
    }
    return count;
}

function createIteratorWithHasNext(array) {
    const iterator = array[Symbol.iterator]();
    let current = iterator.next(); // 预先获取第一个结果
    return {
        next() {
            const value = current;
            current = iterator.next(); // 更新到下一个
            return value.value;
        }, hasNext() {
            return !current.done; // 根据 `done` 判断是否还有值
        },
    };
}

function formatTimestamp(timestamp, format) {
    const date = new Date((timestamp + (8 * 60 * 60)) * 1000);
    const map = {
        'YYYY': date.getUTCFullYear(),
        'MM': String(date.getUTCMonth() + 1).padStart(2, '0'),
        'DD': String(date.getUTCDate()).padStart(2, '0'),
        'HH': String(date.getUTCHours()).padStart(2, '0'),
        'mm': String(date.getUTCMinutes()).padStart(2, '0'),
        'ss': String(date.getUTCSeconds()).padStart(2, '0')
    };
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, matched => map[matched]);
}

function getBlob(path, file, existNames, accessToken) {
    let fileName = file._shortcut_name ? file._shortcut_name : file.getName(), index = 1;
    while (existNames.indexOf(fileName) !== -1) {
        fileName = `${file._shortcut_name ? file._shortcut_name : file.getName()}（重名${index}）`;
        index++;
    }
    existNames.push(fileName);
    path.push(fileName);
    // let mime = file.getMimeType();
    let name = path.join("/");
    let blob = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "?alt=media", {
        method: "GET",
        headers: {"Authorization": "Bearer " + accessToken},
        muteHttpExceptions: true,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    }).getBlob();
    blob.setName(name);
    return blob;
}

function getModifiedTime(folder, accessToken) {
    const r = JSON.parse(UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + folder.getId() + "?includeItemsFromAllDrives=true&supportsAllDrives=true&fields=*", {
        method: "GET",
        headers: {"Authorization": "Bearer " + accessToken},
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    }).getContentText());
    return new Date(r["modifiedTime"]);
}

function deleteForever(file, accessToken) {
    UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId(), {
        method: "DELETE",
        headers: {"Authorization": "Bearer " + accessToken},
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    });
}