// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {openScratchOrg, installDependencies, sourcePushMetadata, addPackageKey, createScratchOrg, importDummyData, deployUnpackagable, assignPermsets, generateLoginLink} from './commands';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	registerOrgCommands(context);
}

function registerOrgCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('einstein.openScratch', () => {
		openScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einstein.createScratch', () => {
		setupScratchOrg();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einstein.dependencyInstall', () => {
		installDependencies();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einstein.addPackageKey', () => {
		addPackageKey();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einstein.importDummyData', () => {
		importDummyData();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einstein.assignPermissionsets', () => {
		assignPermsets();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('einstein.scratchLoginLink', () => {
		generateLoginLink();
	}));
}

function setupScratchOrg() {
	vscode.window.showInputBox({
		title: 'Scratch org alias',
		placeHolder: "MYSCRATCH",
	}).then(value => {
		createScratchOrg(value as string).then( out => {
			installDependencies().then( out => {
				sourcePushMetadata().then( out => {
					deployUnpackagable().then( out => {
						openScratchOrg();
						//Automatically assign default permission sets. This needs to complete before importing dummy data
						assignPermsets().then(out => {
							importDummyData();
						});
					});
				})
			});
		});
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
