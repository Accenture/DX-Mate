import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, PackageDirectory } from './models';
import { dxmateOutput, execShell, getDirectories, workspacePath, ShellCommand, folderExists } from './utils';
import { getPackageDirectoryInput } from './workspace';

export function createProject() {
	vscode.commands.executeCommand('sfdx.force.project.create');
}

//Creates a new scratch org based on name input. Default duration is set to 5 days
export function createScratchOrg(scratchName: string) {
	let cmd = 'sfdx force:org:create ' +
	"-f ./config/project-scratch-def.json " + 
	"--setalias " + scratchName +
	" --durationdays 5 " + 
	"--setdefaultusername";

	let shellCommand = execShell(cmd) as ShellCommand;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfdx force:org:create'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			shellCommand.shellProcess.kill("SIGINT");
		});
		progress.report({  message: 'Creating scratch org' });
		await shellCommand.shellPromise;
		
	});
	return shellCommand.shellPromise;
}

//Generates a login link that can be shared to allow others to log into i.e. a scratch org for test and validation
//NB! This can potentially be used to generate a link to a sandbox or even production organization, handle with care
export async function generateLoginLink() {
	let orgInfo = await getDefaultOrgInfo();

	if(isDevHub(orgInfo)) {
		dxmateOutput.appendLine('No link generation allowed for DevHub');
		return;
	}
	let cmd = 'sfdx force:org:open -r --json';
	execShell(cmd).shellPromise.then(cmdResult => {
		let parsedResult = JSON.parse(cmdResult);
		dxmateOutput.appendLine('WARNING! This link generates a direct opening to the default org\n\n LINK: ' + parsedResult.result.url );
	}).catch(error => {
		dxmateOutput.appendLine('FAILED TO OPEN ORG');
	})
	.finally(() => {
		dxmateOutput.show();
	});
}

//Checks if the default org set is the DevHub itself
function isDevHub(orgInfo: string) {
	let orgInfoObject = JSON.parse(orgInfo);
	return orgInfoObject !== null && orgInfoObject?.sfdxAuthUrl === null;
}

//Calls sfdx command to retrieve default org information
function getDefaultOrgInfo() {
	let cmd = 'sfdx force:org:display --json';
	return execShell(cmd, true).shellPromise;
}

//Opens the default scratch org
export function openScratchOrg() {
	let cmd = 'sfdx force:org:open';

	let shellCommand = execShell(cmd) as ShellCommand;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfdx force:org:open'
	}, async (progress) => {
		
		progress.report({  message: 'Opening default org' });
		await shellCommand.shellPromise;
	});
	return shellCommand.shellPromise;
}


//push metadata from scratch org
export function sourcePushMetadata() {
	let cmd = 'sfdx force:source:push';
	let shellCommand = execShell(cmd) as ShellCommand;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running source push'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			shellCommand.shellProcess.kill("SIGINT");

		});
		
		progress.report({  message: 'Pushing metadata' });
		await shellCommand.shellPromise;
	});

	return shellCommand.shellPromise;
}

//Pull metadata from scratch org
export function sourcePullMetadata() {
	let cmd = 'sfdx force:source:pull';
	let shellCommand = execShell(cmd) as ShellCommand;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running source pull'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			shellCommand.shellProcess.kill("SIGINT");

		});
		progress.report({  message: 'Pulling metadata' });
		await shellCommand.shellPromise;
	});

	return shellCommand.shellPromise;
}

export async function assignDefaultPermsets() {
	if(EXTENSION_CONTEXT.isMultiPackageDirectory) {
		let packageDirectory = await getPackageDirectoryInput() as PackageDirectory;
		if(packageDirectory) { assignPermsets(packageDirectory.package); }
	}
	else {
		assignPermsets();
	}
}

//Assings all default permission sets defined in the workspace settings
export function assignPermsets(packageName?: string) {
	//Get the permets to assign på default by reading json config file.
	let permsets = getDefaultPermsetConfig(packageName);

	let promiseList = new Array();
	if(permsets && permsets.length > 0) {
		permsets.forEach(permset => {
			let cmd = 'sfdx force:user:permset:assign -n ' + permset;
			promiseList.push(execShell(cmd).shellPromise);
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
		dxmateOutput.appendLine('No permission sets to assign');
		dxmateOutput.show();
	}
	return Promise.all(promiseList);
}

function getDefaultPermsetConfig(packageName?: string) {
	if(packageName !== undefined) {
		const multiDefaultConfig = vscode.workspace.getConfiguration().get('multi.scratch.default.permissionsets') as string;
		let configObj = multiDefaultConfig && multiDefaultConfig !== '' ? JSON.parse(multiDefaultConfig) : null;
		configObj.find((config: any) => {
			return config.packagename === packageName;
		})?.permissionsets as string[];
	}
	else{
		return vscode.workspace.getConfiguration().get('scratch.default.permissionsets') as string[];
	}
}

//Get configuration and deploys metadata that is stored in the unpackagable location
export function deployUnpackagable() {
	//Get path to unpackagable and deploy
	let unpackPath = vscode.workspace.getConfiguration().get('unpackagable.location');
	if(!unpackPath || unpackPath === '') {
		return new Promise<string>((resolve, reject) => {
			resolve('No unpack');
		});
	}
	if(!folderExists(workspacePath as string + unpackPath)) {
		dxmateOutput.appendLine('Could not find valid directory at: ' + workspacePath as string + unpackPath + '\nSkipping unpackagable deploy');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('Unpack not found');
		});
	}

	let shellCommand = execShell('sfdx force:source:deploy -p ' + unpackPath);
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Deploying unpackagable'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			shellCommand.shellProcess.kill("SIGINT");

		});
		progress.report({  message: 'Deploying metadata from: ' + unpackPath });
		await shellCommand.shellPromise;
	});

	return shellCommand.shellPromise;
}

//Iterates all folder in the dummy data folder to run sfdx import using the plan.json file
export function importDummyData() { 
	let dummyDataFolder = vscode.workspace.getConfiguration().get('dummy.data.location') as string;
	let directories = getDirectories(workspacePath as string + dummyDataFolder);

	let promiseArray = new Array();
	let commandArray = new Array();
	directories.forEach((dataDirectory: string) => {
		let planJsonPath = workspacePath as string + dummyDataFolder + '/' + dataDirectory + '/plan.json';
		let cmd = 'sfdx force:data:tree:import --plan ' + planJsonPath;
		let shellCommand = execShell(cmd) as ShellCommand;
		commandArray.push(shellCommand);
		promiseArray.push(shellCommand.shellPromise);
	});
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Importing dummy data'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			commandArray.forEach(command => {
				command.shellProcess.kill("SIGINT");
			});
		});
		progress.report({  message: 'Running dummy data import' });
		await Promise.all(promiseArray);
	});
}

//Allows calling sfdx export on the default org to retrieve data on json format
//Stored in the chosen outputDirectory
export function sfdxExportData() {
	let inputQuery, outputDir;

	let cmd = 'sfdx force:data:tree:export --json --outputdir ' + outputDir + ' --query ' + inputQuery;
}