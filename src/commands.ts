import * as vscode from 'vscode';
import { createFile, createFolder, einsteinOutput, execShell, folderExists, getDirectories, getFile, workspacePath } from './utils';

//Creates a new scratch org based on name input. Default duration is set to 5 days
export function createScratchOrg(scratchName: string) {
	let cmd = 'sfdx force:org:create ' +
	"-f ./config/project-scratch-def.json " + 
	"--setalias " + scratchName +
	" --durationdays 5 " + 
	"--setdefaultusername";

	let shellPromise = execShell(cmd);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfdx force:org:create'
	}, async (progress) => {
		
		progress.report({  message: 'Creating scratch org' });
		await shellPromise;
	});
	return shellPromise;
}

//Generates a login link that can be shared to allow others to log into i.e. a scratch org for test and validation
//NB! This can potentially be used to generate a link to a sandbox or even production organization, handle with care
export function generateLoginLink() {
	let cmd = 'sfdx force:org:open -r --json';
	execShell(cmd).then(cmdResult => {
		let parsedResult = JSON.parse(cmdResult);
		einsteinOutput.appendLine('WARNING! This link generates a direct opening to the default org\n\n LINK: ' + parsedResult.result.url );
	}).catch(error => {
		einsteinOutput.appendLine('FAILED TO OPEN ORG');
	})
	.finally(() => {
		einsteinOutput.show();
	});
}

//Opens the default scratch org
export function openScratchOrg() {
	let cmd = 'sfdx force:org:open';

	let shellPromise = execShell(cmd);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfdx force:org:open'
	}, async (progress) => {
		
		progress.report({  message: 'Opening default org' });
		await shellPromise;
	});
	return shellPromise;
}

//utilizes sfpowerkit to install dependencies. Might need to have an install script to install this automatically
export function installDependencies() {
	let keyParams = getPackageKeys(); //Get package.json, and find dependencies. keysParam must be a list 
	if(keyParams === '') {
		//No dependencies
		einsteinOutput.appendLine('No Dependencies to install');
		einsteinOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('No Dependencies');
		});
	}
	//Verify sfpowerkit is installed, or else rund the installation
	let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10 --installationkeys ' + keyParams;

	einsteinOutput.appendLine('FULL COMMAND:  ' + cmd);
    einsteinOutput.show();

	let shellPromise = execShell(cmd);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfpowerkit dependency install'
	}, async (progress) => {
		
		progress.report({  message: 'Installing package dependencies' });
		await shellPromise;
	});

	return shellPromise;
}

function getPackageKeys() {
	let packageKey = getPackageKey();
    let keyParams = '';
    const projFile = getFile(workspacePath + '/sfdx-project.json');
    let jsonData = JSON.parse(projFile);

    //Check if dependencies exists
	//Possibly support for mulit package directories?
    if(jsonData.packageDirectories[0].dependencies) {
        jsonData.packageDirectories[0].dependencies.forEach((dependency: any) => {
			einsteinOutput.appendLine('DEPENDENCY:  ' + dependency.package);
            keyParams += dependency.package + ':' + packageKey + ' ' ;
        });
		einsteinOutput.show();
    }

    return keyParams;
}

//Get the package key stored in einstein_config. See if we need to support package key per dependency
function getPackageKey() {
	return getFile(workspacePath + '/einstein_config/.packageKey');
}

//push metadata from scratch org
export function sourcePushMetadata() {
	let cmd = 'sfdx force:source:push';
	let shellPromise = execShell(cmd);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running source push'
	}, async (progress) => {
		
		progress.report({  message: 'Pushing metadata' });
		await shellPromise;
	});

	return shellPromise;
}

//Pull metadata from scratch org
export function sourcePullMetadata() {
	let cmd = 'sfdx force:source:pull';
	let shellPromise = execShell(cmd);

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running source pull'
	}, async (progress) => {
		
		progress.report({  message: 'Pulling metadata' });
		await shellPromise;
	});

	return shellPromise;
}

//Assings all default permission sets defined in the workspace settings
export function assignPermsets() {
	//Get the permets to assign på default by reading json config file.
	let permsets = vscode.workspace.getConfiguration().get('scratch.default.permissionsets') as string[];

	let promiseList = new Array();
	if(permsets.length > 0) {
		permsets.forEach(permset => {
			let cmd = 'sfdx force:user:permset:assign -n ' + permset;
			promiseList.push(execShell(cmd));
		});

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: 'Permission set assignment'
		}, async (progress) => {
			
			progress.report({  message: 'Assigning permission sets' });
			await Promise.all(promiseList);
		});
	}
	else{
		einsteinOutput.appendLine('No permission sets to assign');
		einsteinOutput.show();
	}
	return Promise.all(promiseList);
}

//Get configuration and deploys metadata that is stored in the unpackagable location
export function deployUnpackagable() {
	//Get path to unpackagable and deploy
	let unpackPath = vscode.workspace.getConfiguration().get('unpackagable.location');
	if(!unpackPath || unpackPath === '') {
		return new Promise<string>((resolve, reject) => {
			resolve('no unpack');
		});
	}

	let shellPromise = execShell('sfdx force:source:deploy -p ' + unpackPath);
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Deploying unpackagable'
	}, async (progress) => {
		
		progress.report({  message: 'Deploying metadata from: ' + unpackPath });
		await shellPromise;
	});

	return shellPromise;
}

//Iterates all folder in the dummy data folder to run sfdx import using the plan.json file
export function importDummyData() { 
	let dummyDataFolder = vscode.workspace.getConfiguration().get('dummy.data.location') as string;
	let directories = getDirectories(workspacePath as string + dummyDataFolder);

	let promiseArray = new Array();
	directories.forEach((dataDirectory: string) => {
		let planJsonPath = workspacePath as string + dummyDataFolder + '/' + dataDirectory + '/plan.json';
		let cmd = 'sfdx force:data:tree:import --plan ' + planJsonPath;

		promiseArray.push(execShell(cmd));
	});
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Importing dummy data'
	}, async (progress) => {
		
		progress.report({  message: 'Running dummy data import' });
		await Promise.all(promiseArray);
	});
}

//Updating config file with input package key
export function addPackageKey() {
	vscode.window.showInputBox({
		title: 'Package key',
		placeHolder: "KEY",
	}).then(value => {
		if(value) {
			if(!folderExists(workspacePath + '/einstein_config')) { 
				createFolder(workspacePath + '/einstein_config');
			}
			createFile(workspacePath + '/einstein_config/.packageKey', value);
		}
	});
}