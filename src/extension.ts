// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {openScratchOrg, sourcePushMetadata, importDummyData, generateLoginLink, sourcePullMetadata, createProject, assignDefaultPermsets, createScratchOrgJob, sourcePushMetadataJob, deployUnpackagableJob, openScratchOrgJob, importDummyDataJob, assignPermsetsJob, sfdxExportData, getScratchFromPool, sfdmuExport} from './commands/commands';
import { EXTENSION_CONTEXT } from './models';
import {inputUpdateDependencyKey, addDependency} from './commands/dependencyCommands';
import { installDependencies, installDependenciesJob } from './commands/packageCommands';
import { checkPoolingEnabled, folderExists, workspacePath } from './utils';
import { RunningTaskProvider } from './RunningTaskProvider';
import { depKeyMigrator } from './legacyHandlers/depLegacy';
import { createUser } from './commands/userCommands';
import { generateFieldMarkdown } from './commands/explorerCommands';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	checkContext();
	depKeyMigrator();
	registerOrgCommands(context);
	registerJobTracker();
	vscode.commands.executeCommand("setContext", "extensionActivated", true);
}

function registerJobTracker() {
	let runningTaskProvider = new RunningTaskProvider();
	EXTENSION_CONTEXT.setRunningTaskProvider(runningTaskProvider);
	vscode.window.registerTreeDataProvider(
		'runningTasks',
		runningTaskProvider
	);

	vscode.commands.registerCommand('runningTasks.refreshEntry', () =>
		runningTaskProvider.refresh()
	);
	vscode.commands.registerCommand('runningTasks.cancel', () =>
		EXTENSION_CONTEXT.cancelJobs()
	);
	vscode.commands.registerCommand('runningTasks.clear', () =>
		EXTENSION_CONTEXT.clearJobs()
	);
}

function checkContext() {
	vscode.commands.executeCommand("setContext", "hasSfdxProject", folderExists(workspacePath + '/sfdx-project.json'));
	checkPoolingEnabled();
}

function registerOrgCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('dxmate.openScratch', () => {
		openScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.getScratchFromPool', () => {
		getScratchFromPool();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.createProject', () => {
		createProject();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.createScratch', () => {
		setupScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.dependencyInstall', () => {
		installDependencies();
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

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.createUser', () => {
		createUser();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.exportData', () => {
		sfdxExportData();
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

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.generateFieldMarkdown', (target: vscode.Uri) => {
		generateFieldMarkdown(target);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dxmate.generateFieldMarkdown', (target: vscode.Uri) => {
		sfdmuExport(target);
	}));
}

async function setupScratchOrg() {
	vscode.window.showInputBox({
		title: 'Scratch org alias',
		placeHolder: "MYSCRATCH",
	}).then(async (alias) => {
		if(!alias){
			return;//Cancelled
		}
		vscode.window.showInputBox({
			title: 'Scratch org duartion',
			value: "5",
			validateInput: input => {
				if(isNaN(parseInt(input))) {
					//If the input is not a number, show validation error
					return `Input must be a valid integer`;
				}
				else{
					return null; //Valid
				}
			}
		}).then(async (duration) => {
			if(!duration){
				return;//Cancelled
			}

			console.log('RUNNING SCRATCH ORG CREATE');
			createScratchOrgJob(alias as string, duration as string);
			//Dependency job includes a secondary validate process that afterwards resolves a promise
			await installDependenciesJob();
			sourcePushMetadataJob();
			deployUnpackagableJob();
			openScratchOrgJob();
			assignPermsetsJob();
			importDummyDataJob(alias);

			EXTENSION_CONTEXT.startJobs();
		});
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
