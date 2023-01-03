import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, Job, PackageDirectory } from '../models';
import { dxmateOutput, getDirectories, workspacePath, ShellCommand, folderExists, IS_MULTI_PCKG_DIRECTORY, getFile } from '../utils';
import { getPackageDirectoryInput } from '../workspace';

export function createProject() {
	vscode.commands.executeCommand('sfdx.force.project.create');
}

//Creates a new scratch org based on name input. Default duration is set to 5 days
export function createScratchOrg(scratchName: string) {
	createScratchOrgJob(scratchName).startJobs();
}

/**
 * Handle deletion of scratch with same alias before creating new one
 * @param alias 
 */
function deleteScratchOrgJob(alias: string) {
	const cmd = `sfdx force:org:delete -u ${alias} -p`;
	return new Job('Delete Matching Alias', new ShellCommand(cmd, true));
}

/**
 * Helper use upon scratch creation to see if the input alias has already been used, if so -> the original scratch org with same alias
 * @param scratchName 
 * @param parentJob 
 * @returns 
 */
function handleExistingAliases(scratchName: string, parentJob: Job) {
	const cmd = 'sfdx force:org:list --json';
	let shellCmd = new ShellCommand(cmd, true);
	const promiseHandler = (cmdResult: string) => {
		const parsedResult = JSON.parse(cmdResult);
		if(parsedResult.result?.scratchOrgs && parsedResult.result?.scratchOrgs.length > 0) {
			for (let index = 0; index < parsedResult.result.scratchOrgs.length; index++) {
				const scratchOrg = parsedResult.result.scratchOrgs[index];
				if(scratchOrg.alias === scratchName) {
					parentJob.addJob(deleteScratchOrgJob(scratchName));
				}
			}
		}
	};

	shellCmd.promiseHandler = promiseHandler;
	return new Job('Check Scratch Aliases', shellCmd);
}

export function createScratchOrgJob(scratchName: string) {
	const cmd = 'sfdx force:org:create ' +
	"-f ./config/project-scratch-def.json " + 
	"--setalias " + scratchName +
	" --durationdays 5 " + 
	"--setdefaultusername";

	let shellJob = new Job('Create New Scratch Org');
	const onHandlingFinished = () => {
		//when handling existing aliases is finished the create scratch org step is queued
		shellJob.addJob(new Job('Create Scratch Org', new ShellCommand(cmd)));
	};

	let handlingJob = handleExistingAliases(scratchName, shellJob);
	handlingJob.onJobFinish = onHandlingFinished;
	shellJob.addJob(handlingJob);
	return EXTENSION_CONTEXT.addJob(shellJob);
}

export async function getScratchFromPool() {
	let tagInput = await vscode.window.showInputBox({
        title: 'Pool tag',
        placeHolder: "tag",
    });
	if(!tagInput) { return; }

	let aliasInput = await vscode.window.showInputBox({
        title: 'Scratch org alias',
        placeHolder: "alias",
    });
	if(!aliasInput) { return; }

	getScratchFromPoolJob(tagInput, aliasInput);
	EXTENSION_CONTEXT.startJobs();

}

function getScratchFromPoolJob(tag: string, alias: string) {
	const cmd = `sfdx sfpowerscripts:pool:fetch --tag ${tag} -a ${alias}`;
	const shellJob = new Job('Get Scratch From Pool', new ShellCommand(cmd));
	EXTENSION_CONTEXT.addJob(shellJob);
}

//Generates a login link that can be shared to allow others to log into i.e. a scratch org for test and validation
//NB! This can potentially be used to generate a link to a sandbox or even production organization, handle with care
export async function generateLoginLink() {
	let orgInfo = await getDefaultOrgInfo();

	if(orgInfo && isDevHub(orgInfo)) {
		dxmateOutput.appendLine('No link generation allowed for DevHub');
		return;
	}
	let cmd = 'sfdx force:org:open -r --json';
	const promiseHandler = (cmdResult: string) => {
		let parsedResult = JSON.parse(cmdResult as string);
		dxmateOutput.appendLine('WARNING! This link generates a direct opening to the default org\n\n LINK: ' + parsedResult.result.url );
	};
	const shellCommand = new ShellCommand(cmd);
	shellCommand.promiseHandler = promiseHandler;
	const shellJob = new Job('Creating login url', shellCommand);
	
	EXTENSION_CONTEXT.addJob(shellJob);
	EXTENSION_CONTEXT.startJobs();
}

//Checks if the default org set is the DevHub itself
function isDevHub(orgInfo: string) {
	let orgInfoObject = JSON.parse(orgInfo);
	return orgInfoObject !== null && orgInfoObject?.sfdxAuthUrl === null;
}

//Calls sfdx command to retrieve default org information
function getDefaultOrgInfo() {
	let cmd = 'sfdx force:org:display --json';
	return new Job('Get default org info', new ShellCommand(cmd, true)).startJob(); 
}

//Opens the default scratch org
export function openScratchOrg() {
	openScratchOrgJob().startJobs();
}

export function openScratchOrgJob() {
	let cmd = 'sfdx force:org:open';
	let shellJob = new Job('Open Scratch Org', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
}


//push metadata from scratch org
export function sourcePushMetadata() {
	sourcePushMetadataJob().startJobs();
}

export function sourcePushMetadataJob() {
	let cmd = 'sfdx force:source:push';
	let shellJob = new Job('Push Metadata', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
}

//Pull metadata from scratch org
export function sourcePullMetadata() {
	sourcePullMetadataJob().startJobs();
}

export function sourcePullMetadataJob() {
	let cmd = 'sfdx force:source:pull';
	let shellJob = new Job('Pull Metadata', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
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
	let jobAdded = assignPermsetsJob(packageName);

	if(jobAdded === true) {
		EXTENSION_CONTEXT.startJobs();
	}
}

export function assignPermsetsJob(packageName?: string): boolean {
	//Get the permets to assign på default by reading json config file.
	let permsets = getDefaultPermsetConfig(packageName);
	if(permsets && permsets.length > 0) {
		let shellJob = new Job('Assign Default Permission Sets');
		permsets.forEach(permset => {
			let cmd = 'sfdx force:user:permset:assign -n ' + permset;
			shellJob.addJob(new Job('Assign: ' + permset, new ShellCommand(cmd)));
		});
		EXTENSION_CONTEXT.addJob(shellJob);
		return true;
	}
	else{
		dxmateOutput.appendLine('No permission sets to assign');
		dxmateOutput.show();
		return false;
	}
}

function getDefaultPermsetConfig(packageName?: string) {
	if(packageName !== undefined && IS_MULTI_PCKG_DIRECTORY()) {
		const multiDefaultConfig = vscode.workspace.getConfiguration().get('multi.scratch.default.permissionsets') as string;
		let configObj = multiDefaultConfig && multiDefaultConfig.length > 0 ? JSON.parse(multiDefaultConfig) : null;
		if(!configObj) { return null; }
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
	let shellJob = deployUnpackagableJob();
	
	if(shellJob instanceof EXTENSION_CONTEXT) {
		EXTENSION_CONTEXT.startJobs();
	}
}

export function deployUnpackagableJob(): EXTENSION_CONTEXT | Promise<string> {
	//Get path to unpackagable and deploy
	let unpackPath = vscode.workspace.getConfiguration().get('unpackagable.location') as string;
	if(!unpackPath || unpackPath === '') {
		return new Promise<string>((resolve, reject) => {
			resolve('No unpack');
		});
	}
	const relPath = unpackPath.startsWith('/') ? unpackPath : '/' + unpackPath;
	if(!folderExists(workspacePath as string + unpackPath)) {
		dxmateOutput.appendLine('Could not find valid directory at: ' + workspacePath as string + relPath + '\nSkipping unpackagable deploy');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('Unpack not found');
		});
	}

	let cmd = 'sfdx force:source:deploy -p ' + workspacePath as string + relPath;
	let shellJob = new Job('Deploy Unpackagable Metadata', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
}

//Iterates all folder in the dummy data folder to run sfdx import using the plan.json file
export function importDummyData() { 
	let jobSubmitted = importDummyDataJob();

	if(jobSubmitted === true) {
		EXTENSION_CONTEXT.startJobs();
	}
}

export function importDummyDataJob(): boolean {
	let dummyDataFolder = vscode.workspace.getConfiguration().get('dummy.data.location') as string;
	const relPath = dummyDataFolder.startsWith('/') ? dummyDataFolder : '/' + dummyDataFolder;
	let directories = getDirectories(workspacePath as string + relPath);

	if(directories.length > 0) {
		let shellJob = new Job('Import Dummy Data');
		directories.forEach((dataDirectory: string) => {
			let planJsonPath = workspacePath as string + relPath + '/' + dataDirectory + '/plan.json';
			let cmd = 'sfdx force:data:tree:import --plan ' + planJsonPath;
			shellJob.addJob(new Job('Import: ' + dataDirectory, new ShellCommand(cmd)));
		});

		EXTENSION_CONTEXT.addJob(shellJob);
		return true;
	}
	else{
		return false;
	}
}

//Allows calling sfdx export on the default org to retrieve data on json format
//Stored in the chosen outputDirectory
export async function sfdxExportData() {
	let inputQuery: string, outputDir;
	const soqlFiles = await getSoqlFiles();

	if(soqlFiles.length === 0) {
		//No SOQL files created. Prompt user to generate SOQL in query builder
		vscode.window.showInformationMessage('No query files found in workspace, create new in SOQL builder?',
		...['Yes', 'No']).then(resp => {
			if(resp === 'Yes') {
				vscode.commands.executeCommand('soql.builder.open.new');		
			}
			return;
		});
	}

	else{
		const quickPicks = getSoqlQuickPicks(soqlFiles);
		vscode.window.showQuickPick(quickPicks, {
			title: 'Select SOQL file to use',
			canPickMany: false
		}).then(selectedSoql => {
			if(!selectedSoql) {
				//Cancelled
				return;
			}
			inputQuery = selectedSoql.detail as string;

			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select output directory',
				canSelectFiles: false,
				canSelectFolders: true
			};

			vscode.window.showOpenDialog(options).then(fileUri => {
				if (fileUri && fileUri[0]) {
					outputDir = fileUri[0].fsPath;
					let cmd = 'sfdx force:data:tree:export --json --outputdir ' + outputDir + ` --query \"${inputQuery}\"`;
					const shellJob = new Job('Export data', new ShellCommand(cmd));
					EXTENSION_CONTEXT.addJob(shellJob);
					EXTENSION_CONTEXT.startJobs();
				}
				else{
					return;
				}
			});
		});
	}
}

function getSoqlQuickPicks(soqlFiles: any[]): vscode.QuickPickItem[] {
	let options: vscode.QuickPickItem[] = [];
	soqlFiles.forEach((file): any => {
		options.push({label: file.name, detail: file.soql});
	});
	return options;
}

function getSoqlFiles() {
	return vscode.workspace.findFiles('**/*.soql', null, 50).then((uris: vscode.Uri[] ) => {            
		let soqlFiles: any[] = [];
		uris.forEach(uri => {
			let fileContent = getFile(uri.fsPath);
			soqlFiles.push({name: uri.fsPath.slice(uri.fsPath.lastIndexOf('/') + 1), soql: fileContent});
		});

		return soqlFiles;
	}); 
}
