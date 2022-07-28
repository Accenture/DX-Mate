import * as vscode from 'vscode';
import { dxmateOutput, execShell, getDirectories, workspacePath, ShellCommand } from './utils';

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
export function generateLoginLink() {
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
	}, async (progress) => {
		
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
	}, async (progress) => {
		
		progress.report({  message: 'Pulling metadata' });
		await shellCommand.shellPromise;
	});

	return shellCommand.shellPromise;
}

//Assings all default permission sets defined in the workspace settings
export function assignPermsets() {
	//Get the permets to assign på default by reading json config file.
	let permsets = vscode.workspace.getConfiguration().get('scratch.default.permissionsets') as string[];

	let promiseList = new Array();
	if(permsets.length > 0) {
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

//Get configuration and deploys metadata that is stored in the unpackagable location
export function deployUnpackagable() {
	//Get path to unpackagable and deploy
	let unpackPath = vscode.workspace.getConfiguration().get('unpackagable.location');
	if(!unpackPath || unpackPath === '') {
		return new Promise<string>((resolve, reject) => {
			resolve('no unpack');
		});
	}

	let shellPromise = execShell('sfdx force:source:deploy -p ' + unpackPath).shellPromise;
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

		promiseArray.push(execShell(cmd).shellPromise);
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

//Allows calling sfdx export on the default org to retrieve data on json format
//Stored in the chosen outputDirectory
export function sfdxExportData() {
	let inputQuery, outputDir;

	let cmd = 'sfdx force:data:tree:export --json --outputdir ' + outputDir + ' --query ' + inputQuery;
}