import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';
import { EXTENSION_CONTEXT } from './models';

//Class containing a promise for executing a shellCommand and also the child process running the command
export class ShellCommand{
    shellPromise;
    shellProcess;

    constructor(shellPromise: Promise<string>, shellProcess: any) {
        this.shellPromise = shellPromise;
        this.shellProcess = shellProcess;
    }
}

export function refreshRunningTasks() {
    EXTENSION_CONTEXT.refreshRunningTasks;
}
/**
 * Get the sfdx-project.json file from current project
 * @returns 
 */
// eslint-disable-next-line
export function SFDX_PROJECT_JSON(): string {
    console.log('GETTING PROJECT JSON');
    return getFile(workspacePath + '/sfdx-project.json') as string;
}
/**
 * Check if the current project is a multi package project
 * @returns 
 */
// eslint-disable-next-line
export function IS_MULTI_PCKG_DIRECTORY(): boolean {
    let projJson = JSON.parse(SFDX_PROJECT_JSON());
    return projJson?.packageDirectories?.length > 1;
};
const workSpaceUri = vscode?.workspace?.workspaceFolders?.[0].uri;
export const workspacePath = workSpaceUri?.fsPath;
//Creates the extension output channel
export const dxmateOutput = vscode.window.createOutputChannel("DX Mate");

export function getFile(filePath: string) {
	//Returrn the file using fs
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
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

/**
 * Function to initiate terminal processes from vscode. input command to run and optional param to suppress output to the dxMate output channel
 * @param cmd 
 * @param suppressOutput 
 * @returns ShellCommand
 */
export function execShell(cmd: string, suppressOutput = false) {
    let process = cp.exec(cmd, {cwd: workspacePath}, (err, out) => {
        if(err && err.signal !== 'SIGINT') {
            dxmateOutput.appendLine("An error occurred: \n " + err);
            dxmateOutput.show();
        }
    });

    let shellPromise = new Promise<string>((resolve, reject) => {
        dxmateOutput.appendLine("Running: " + cmd);
        dxmateOutput.show();

        //Stores output for the child_process in the onData event
        let output= "";

        const handleRetry = () => {
            vscode.window.showErrorMessage(
                'An error occurred. See DX-Mate output for info',
                ...['Retry', 'Cancel']
            )
            .then(value => {
                if(value === 'Retry') {
                    execShell(cmd, suppressOutput).shellPromise.then(() => {
                        resolve('Retry success');
                    });
                }
                else{
                    return reject('Error');
                }
            });
        };

        process.on('exit', (code, signal) =>{
            if(signal === 'SIGINT') {
                dxmateOutput.appendLine("Process was cancelled");
                return reject('Cancelled');
            }

            if(code === 0) {
                dxmateOutput.appendLine("Finished running: " + cmd);
                return resolve(output);
            }
            else{
                handleRetry();
            }
        });

        if(suppressOutput === false) {
            process.stdout?.on('data', data => {
                output += data;
                //Adding stream to the output console for the process
                //Possibly give ability to see what subprocess is ongoing
                dxmateOutput.appendLine(data);
            });
        }
    });
    return new ShellCommand(shellPromise, process);
}