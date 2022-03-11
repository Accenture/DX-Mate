"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execShell = exports.getDirectories = exports.createFolder = exports.folderExists = exports.createFile = exports.getFile = exports.einsteinOutput = exports.workspacePath = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
exports.workspacePath = vscode?.workspace?.workspaceFolders?.[0].uri.path;
//Creates the extension output channel
exports.einsteinOutput = vscode.window.createOutputChannel("Einstein");
function getFile(filePath) {
    //Returrn the file using fs
    return fs.readFileSync(filePath, 'utf-8');
}
exports.getFile = getFile;
function createFile(absPath, data) {
    fs.writeFileSync(absPath, data);
}
exports.createFile = createFile;
function folderExists(path) {
    return fs.existsSync(path);
}
exports.folderExists = folderExists;
function createFolder(absPath) {
    fs.mkdirSync(absPath);
}
exports.createFolder = createFolder;
function getDirectories(absPath) {
    return fs.readdirSync(absPath).filter(function (file) {
        return fs.statSync(absPath + '/' + file).isDirectory();
    });
}
exports.getDirectories = getDirectories;
//Use this to handle chained promises and command handling.
function execShell(cmd) {
    return new Promise((resolve, reject) => {
        exports.einsteinOutput.appendLine("Running: " + cmd);
        exports.einsteinOutput.show();
        cp.exec(cmd, { cwd: exports.workspacePath }, (err, out) => {
            if (err) {
                vscode.window.showQuickPick(['YES', 'NO'], {
                    title: "An error occurred, do you wish to retry?",
                    canPickMany: false,
                    placeHolder: 'YES'
                })
                    .then(value => {
                    if (value && value === 'YES') {
                        execShell(cmd);
                    }
                    else {
                        return reject(err);
                    }
                });
            }
            exports.einsteinOutput.appendLine("Finished running: " + cmd);
            return resolve(out);
        });
    });
}
exports.execShell = execShell;
//# sourceMappingURL=utils.js.map