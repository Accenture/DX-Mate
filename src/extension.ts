// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {openScratchOrg, sourcePushMetadata, createScratchOrg, importDummyData, generateLoginLink, sourcePullMetadata, createProject, assignDefaultPermsets, createScratchOrgJob, sourcePushMetadataJob, deployUnpackagableJob, openScratchOrgJob, importDummyDataJob, assignPermsetsJob} from './commands';
import { EXTENSION_CONTEXT, PackageDirectory } from './models';
import {inputUpdateDependencyKey, addDependency} from './dependencyCommands';
import {getPackageDirectories, getPackageDirectoryInput} from './workspace';
import { installDependenciesForPackage, installDependenciesJob } from './packageCommands';
import { folderExists, workspacePath } from './utils';
import { RunningTaskProvider } from './RunningTaskProvider';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	checkContext();
	registerOrgCommands(context);
	vscode.commands.executeCommand("setContext", "extensionActivated", true);

	let runningTaskProvider = new RunningTaskProvider();
	EXTENSION_CONTEXT.setRunningTaskProvider(runningTaskProvider);
	vscode.window.registerTreeDataProvider(
		'runningTasks',
		runningTaskProvider
	);

	vscode.commands.registerCommand('runningTasks.refreshEntry', () =>
		runningTaskProvider.refresh()
	);
}

function checkContext() {
	vscode.commands.executeCommand("setContext", "hasSfdxProject", folderExists(workspacePath + '/sfdx-project.json'));
}

function registerOrgCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('dxmate.openScratch', () => {
		openScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.createProject', () => {
		createProject();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.createScratch', () => {
		setupScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.dependencyInstall', () => {
		installDependenciesForPackage();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.updateDependencyKey', () => {
		inputUpdateDependencyKey();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.pullSource', () => {
		sourcePullMetadata();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.pushSource', () => {
		sourcePushMetadata();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.importDummyData', () => {
		importDummyData();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.assignPermissionsets', () => {
		assignDefaultPermsets();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dxmate.scratchLoginLink', () => {
		generateLoginLink();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dxmate.addDependency', () => {
		addDependency();
	}));
}

async function setupScratchOrg() {
	let packageDirectory: PackageDirectory;
	if(EXTENSION_CONTEXT.isMultiPackageDirectory === true) {
		packageDirectory = await getPackageDirectoryInput() as PackageDirectory;

		if(!packageDirectory) {
			return; //User cancelled
		}
	}
	else{
		packageDirectory = getPackageDirectories()[0];
	}

	vscode.window.showInputBox({
		title: 'Scratch org alias',
		placeHolder: "MYSCRATCH",
	}).then(value => {
		if(!value){
			return;//Cancelled
		}
		console.log('RUNNING SCRATCH ORG CREATE WITH: ' + packageDirectory.package);
		createScratchOrgJob(value as string);
		//Dependency job includes a secondary validate process that afterwards resolves a promise
		installDependenciesJob(packageDirectory.package).then( out => {
			sourcePushMetadataJob();
			deployUnpackagableJob();
			openScratchOrgJob();
			assignPermsetsJob(packageDirectory.package);
			importDummyDataJob();
		});

		EXTENSION_CONTEXT.startJobs();
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
