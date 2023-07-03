import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, Job } from '../models';
import { getFile, ShellCommand } from '../utils';


class DummyUser {
    LastName: string = '';
    Alias: string = '';
    TimeZoneSidKey: string = '';
    LocaleSidKey: string = '';
    EmailEncodingKey: string = '';
    LanguageLocaleKey: string = '';
    profileName: string = '';
    permsets: string[] = [];
    generatePassword: boolean = false;
}

/**
 * Get the configured path for dummy users
 * @returns 
 */
function getUserConfigPath() {
    return vscode.workspace.getConfiguration().get('dummy.users.location') as string;
}

/**
 * Initiates process to create a dummy user
 * @returns 
 */
export async function createUser() {
    const userQuickPickItem = await getUserJsonInput();
    if(!userQuickPickItem) { return; }

    const chosenUser = Object.assign(new DummyUser(), JSON.parse(userQuickPickItem.detail as string));

    const username = chosenUser.LastName + '@my.scratch';
    createUserJob(userQuickPickItem.description as string, username, chosenUser.generatePassword);
    EXTENSION_CONTEXT.startJobs();
}

/**
 * Sets context to check if dummy user config path has been set in settings
 */
export function activateDummyUserCommands() {
    if(getUserConfigPath()) {
        vscode.commands.executeCommand("setContext", "dummyUserActivated", true);
    }
}

/**
 * Adds user creation job to the job queue
 * @param userFile 
 * @param username 
 * @param generatepassword 
 */
function createUserJob(userFile: string, username: string, generatepassword: boolean) {
    let cmd = `sf org create user -f ${userFile} username=${username} email=${username} generatepassword=${generatepassword}`;
    let shellJob = new Job('Create dummy user', new ShellCommand(cmd));
    EXTENSION_CONTEXT.addJob(shellJob);
}

/**
 * Show a list of valid user json files to select for user creation in a scratch org
 */
async function getUserJsonInput() {
    let userOptions = await getUserConfigs() as vscode.QuickPickItem[];
    if(!userOptions) {
        vscode.window.showInformationMessage('No .json files found in configured directory');
        //Allow prompting creation of a new file in the configured directory
        return null;
    }

    return vscode.window.showQuickPick(userOptions, {
        title: 'Select dummy user to create',
        canPickMany: false
    });
}

/**
 * Get the dummy user json files in the configured path to dummy users in workspace config
 */
function getUserConfigs() {
    //If no dummy user config has been defined, return null 
    if(!getUserConfigPath()) { return null; }
    let quickPicks: vscode.QuickPickItem[] = [];
    return vscode.workspace.findFiles(getUserConfigPath() +'/*.json', null, 50).then((uris: vscode.Uri[] ) => {
		uris.forEach(uri => {
			let fileContent = getFile(uri.fsPath) as string;
			quickPicks.push({label: uri.fsPath.slice(uri.fsPath.lastIndexOf('/') + 1), detail: fileContent, description: uri.fsPath});
		});
        return quickPicks;
	}); 

}