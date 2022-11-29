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

function getUserConfigPath() {
    return vscode.workspace.getConfiguration().get('dummy.users.location') as string;
}


export async function createUser() {
    const userQuickPickItem = await getUserJsonInput();
    if(!userQuickPickItem) { return; }

    const chosenUser = Object.assign(new DummyUser(), JSON.parse(userQuickPickItem.detail as string));

    const username = chosenUser.LastName + '@my.scratch';
    createUserJob(userQuickPickItem.description as string, username, chosenUser.generatePassword);
    if(chosenUser.permsets.length > 0) {
        assignUserPermsetsJob('Assign default permsets for ' + username, username, chosenUser.permsets);
    }

    EXTENSION_CONTEXT.startJobs();
}

export function activateDummyUserCommands() {
    if(getUserConfigPath()) {
        vscode.commands.executeCommand("setContext", "dummyUserActivated", true);
    }
}

function createUserJob(userFile: string, username: string, generatepassword: boolean) {
    let cmd = `sfdx force:user:create -f ${userFile} username=${username} email=${username} generatepassword=${generatepassword}`;
    let shellJob = new Job('Create dummy user', new ShellCommand(cmd));
    EXTENSION_CONTEXT.addJob(shellJob);
}

function assignUserPermsetsJob(jobName: string, username: string, permsets: string[]) {
    if(permsets && permsets.length > 0) {
		let shellJob = new Job(jobName);
		permsets.forEach(permset => {
			let cmd = `sfdx force:user:permset:assign -n ${permset} -u ${username}`;
			shellJob.addJob(new Job('Assign: ' + permset, new ShellCommand(cmd)));
		});
		EXTENSION_CONTEXT.addJob(shellJob);
    }
}

/**
 * Show a list of valid user json files to select for user creation in a scratch org
 */
async function getUserJsonInput() {
    let userOptions = await getUserConfigs() as vscode.QuickPickItem[];
    if(!userOptions) {
        vscode.window.showInformationMessage('No .json files found in configured directory');
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