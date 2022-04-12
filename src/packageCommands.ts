import * as vscode from 'vscode';
import { createFile, createFolder, dxmateOutput, execShell, folderExists, getFile, workspacePath } from './utils';

function getPackageKeys() {
	let packageKey = getPackageKey();
    let keyParams = '';
    let dependencies = getDependencies();

    //Check if dependencies exists
	//Possibly support for mulit package directories?
    if(dependencies) {
        dependencies.forEach((dependency: any) => {
			dxmateOutput.appendLine('DEPENDENCY:  ' + dependency.package);
            keyParams += dependency.package + ':' + packageKey + ' ' ;
        });
		dxmateOutput.show();
    }

    return keyParams;
}

//Get the package key stored in dxmate_config. See if we need to support package key per dependency
function getPackageKey() {
	return getFile(workspacePath + '/dxmate_config/.packageKey');
}

function getDependencies() {
	const projFile = getFile(workspacePath + '/sfdx-project.json') as string;
    let jsonData = JSON.parse(projFile);

	return jsonData?.packageDirectories[0]?.dependencies;
}

function getDependencyKeys() {
	const depFile = getFile(workspacePath + '/dxmate_config/dependencyKeys.json');
	return depFile ? JSON.parse(depFile) : null;
}

//Creates the config folder if it is not already present
function createConfigFolder() {
    if(!folderExists(workspacePath + '/dxmate_config')) {
        createFolder(workspacePath + '/dxmate_config');
    }
}

//Adds a new dependency to the sfdx-project.json. If already existing as dependency, the version is overwritten
function addToProjDependencies(packageName: string, packageVersion: string, packageId: string) {
    let projDependencies = getDependencies();
    let added = false;
    if(!projDependencies) {
        projDependencies = [];
    }

    projDependencies.forEach((dependency: any) => {
        if(dependency.package === packageName && packageVersion === packageVersion) {
            added = true;
        }
    });

    if(!added) {
        const projFile = getFile(workspacePath + '/sfdx-project.json') as string;
        let jsonData = JSON.parse(projFile);

        projDependencies.push({package: packageName, versionNumber: packageVersion});
        jsonData.packageDirectories[0].dependencies = projDependencies;
        jsonData.packageAliases[packageName] = packageId;

        createFile(workspacePath + '/sfdx-project.json', JSON.stringify(jsonData, null, 4));
    }
}

function addDependencyGetPackageKeyInput() {
    return vscode.window.showInputBox({
        title: 'Package key',
        placeHolder: "KEY",
    });
}

function addDependencyGetPackageNameInput() {
    return vscode.window.showInputBox({
		title: 'Package name',
		placeHolder: "NAME",
	});
}

function addDependencyGetPackageVersionInput() {
    return vscode.window.showInputBox({
		title: 'Package version',
		placeHolder: "0.1.0.LATEST",
	});
}

function addDependencyGetPackageIdInput() {
    return vscode.window.showInputBox({
		title: 'Package ID',
		placeHolder: "ID",
	});
}

//Adds a new set of dependency keys
function addToDependencyKeys(packageName: string, packageKey: string) {
    createConfigFolder();
    const depFile = getFile(workspacePath + '/dxmate_config/dependencyKeys.json');
    let added = false;
    let dependencies;
    if(!depFile) {
        dependencies = [];
        dependencies.push({packageName: packageName, packageKey: packageKey});
    }
    else{
        dependencies = JSON.parse(depFile);
        dependencies.forEach((dependency: any) => {
            if(dependency.packageName === packageName) {
                dependency.packageKey = packageKey;
                added = true;
            }
        });

        if(!added) {
            dependencies.push({packageName: packageName, packageKey: packageKey});
        }
    }

    createFile(workspacePath + '/dxmate_config/dependencyKeys.json', JSON.stringify(dependencies, null, 4));
}

//Initiate process to add new dependency to project
export async function addDependency() {
		let packageName = await addDependencyGetPackageNameInput() as string;
        let packageVersion = await addDependencyGetPackageVersionInput() as string;
        let packageId = await addDependencyGetPackageIdInput() as string;
        let packageKey = await addDependencyGetPackageKeyInput() as string;

        addToProjDependencies(packageName, packageVersion, packageId);
        addToDependencyKeys(packageName, packageKey);
}

//Updating config file with input package key
export async function addPackageKey() {
	let dependencies = getDependencies();
	let dependencyKeys = getDependencyKeys();

	if(!dependencies) {
		dxmateOutput.appendLine('No registered dependencies in sfdx-project.json');
		dxmateOutput.show();
		return;
	} else{
		if(!folderExists(workspacePath + '/dxmate_config')) { 
			createFolder(workspacePath + '/dxmate_config');
		}
		dependencies.forEach((dependency: any) => {
			let packageName = dependency.package;

			vscode.window.showInputBox({
				title: 'Package key',
				placeHolder: "KEY",
			}).then(value => {
				if(value) {
					if(!folderExists(workspacePath + '/dxmate_config')) { 
						createFolder(workspacePath + '/dxmate_config');
					}
					createFile(workspacePath + '/dxmate_config/.packageKey', value);
				}
			});
		});
	}
}

//utilizes sfpowerkit to install dependencies. Might need to have an install script to install this automatically
export function installDependencies() {
	let dependencies = getDependencies();
	let keyParams = getPackageKeys(); //Get package.json, and find dependencies. keysParam must be a list 

	if(!dependencies) {
		//No dependencies
		dxmateOutput.appendLine('No Dependencies to install');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('No Dependencies');
		});
	}

	//If there are dependencies but not package keys have been registered
	if(keyParams === '') {
		//await addPackageKey();
	}

	//ADD CHECK TO VERIFY THAT A PACKAGE KEY HAS BEEN ADDED TO THE PROJECT, IF NOT, CALL THE ADD PACKAGE KEY COMMAND AND AWAIT
	//Verify sfpowerkit is installed, or else rund the installation
	let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10 --installationkeys \"' + keyParams + '\"';

	dxmateOutput.appendLine('FULL COMMAND:  ' + cmd);
    dxmateOutput.show();

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