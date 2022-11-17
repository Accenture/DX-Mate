import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, Job, PackageDirectory } from './models';
import { dxmateOutput, execShell, getDirectories, workspacePath, ShellCommand, folderExists, IS_MULTI_PCKG_DIRECTORY } from './utils';
import { getPackageDirectoryInput } from './workspace';

export function createProject() {
	vscode.commands.executeCommand('sfdx.force.project.create');
}

//Creates a new scratch org based on name input. Default duration is set to 5 days
export function createScratchOrg(scratchName: string) {
	createScratchOrgJob(scratchName).startJobs();
}

export function createScratchOrgJob(scratchName: string) {
	let cmd = 'sfdx force:org:create ' +
	"-f ./config/project-scratch-def.json " + 
	"--setalias " + scratchName +
	" --durationdays 5 " + 
	"--setdefaultusername";

	let shellJob = new Job('Create Scratch Org', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
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
	execShell(cmd).shellPromise?.then(cmdResult => {
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
	let shellJob = assignPermsetsJob(packageName);

	if(shellJob instanceof EXTENSION_CONTEXT) {
		//If extension context is rerturned we can start the jobs
		EXTENSION_CONTEXT.startJobs();
	}
}

export function assignPermsetsJob(packageName?: string) {
	//Get the permets to assign på default by reading json config file.
	let permsets = getDefaultPermsetConfig(packageName);

	if(permsets && permsets.length > 0) {
		let shellJob = new Job('Assign Default Permission Sets');
		permsets.forEach(permset => {
			let cmd = 'sfdx force:user:permset:assign -n ' + permset;
			shellJob.addJob(new Job('Assign: ' + permset, new ShellCommand(cmd)));
		});
		return EXTENSION_CONTEXT.addJob(shellJob);
	}
	else{
		dxmateOutput.appendLine('No permission sets to assign');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('No permsets to assign');
		});
	}
}

function getDefaultPermsetConfig(packageName?: string) {
	if(packageName !== undefined && IS_MULTI_PCKG_DIRECTORY()) {
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
	let shellJob = deployUnpackagableJob();
	
	if(shellJob instanceof EXTENSION_CONTEXT) {
		EXTENSION_CONTEXT.startJobs();
	}
}

export function deployUnpackagableJob(): EXTENSION_CONTEXT | Promise<string> {
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

	let cmd = 'sfdx force:source:deploy -p ' + unpackPath;
	let shellJob = new Job('Deploy Unpackagable Metadata', new ShellCommand(cmd));
	return EXTENSION_CONTEXT.addJob(shellJob);
}

//Iterates all folder in the dummy data folder to run sfdx import using the plan.json file
export function importDummyData() { 
	let shellJob = importDummyDataJob();

	if(shellJob instanceof EXTENSION_CONTEXT) {
		EXTENSION_CONTEXT.startJobs();
	}
}

export function importDummyDataJob() {
	let dummyDataFolder = vscode.workspace.getConfiguration().get('dummy.data.location') as string;
	let directories = getDirectories(workspacePath as string + dummyDataFolder);

	if(directories.length > 0) {
		let shellJob = new Job('Import Dummy Data');
		directories.forEach((dataDirectory: string) => {
			let planJsonPath = workspacePath as string + dummyDataFolder + '/' + dataDirectory + '/plan.json';
			let cmd = 'sfdx force:data:tree:import --plan ' + planJsonPath;
			shellJob.addJob(new Job('Import: ' + dataDirectory, new ShellCommand(cmd)));
		});

		return EXTENSION_CONTEXT.addJob(shellJob);
	}
	else{
		return new Promise<string>((resolve, reject) => {
			resolve('No dummy data');
		});
	}
}

//Allows calling sfdx export on the default org to retrieve data on json format
//Stored in the chosen outputDirectory
export function sfdxExportData() {
	let inputQuery, outputDir;

	let cmd = 'sfdx force:data:tree:export --json --outputdir ' + outputDir + ' --query ' + inputQuery;
}