import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';

export const workspacePath = vscode?.workspace?.workspaceFolders?.[0].uri.path;
//Creates the extension output channel
export const einsteinOutput = vscode.window.createOutputChannel("Einstein");

export function getFile(filePath: string) {
	//Returrn the file using fs
    return fs.readFileSync(filePath, 'utf-8');
}

export function createFile(absPath: string, data: string) {
    fs.writeFileSync(absPath, data);
}

export function folderExists(path: string) {
    return fs.existsSync(path);
}

export function createFolder(absPath: string) {
    fs.mkdirSync(absPath);
}

export function getDirectories(absPath: string) {
    return fs.readdirSync(absPath).filter(function (file) {
      return fs.statSync(absPath+'/'+file).isDirectory();
    });
}

//Use this to handle chained promises and command handling.
export function execShell(cmd: string) {
    return new Promise<string>((resolve, reject) => {
        einsteinOutput.appendLine("Running: " + cmd);
        einsteinOutput.show();
        cp.exec(cmd, {cwd: workspacePath}, (err, out) => {
            if (err) {
                vscode.window.showQuickPick(['YES', 'NO'], {
                    title: "An error occurred, do you wish to retry?",
                    canPickMany: false,
                    placeHolder: 'YES'
                })
                .then(value => {
                    if(value && value === 'YES') {
                        execShell(cmd);
                    } else{
                        einsteinOutput.appendLine("ERROR: " + err);
                        einsteinOutput.show();
                        return reject(err);
                    }
                });
            }
            einsteinOutput.appendLine("Finished running: " + cmd);
            return resolve(out);
        });
    });
}