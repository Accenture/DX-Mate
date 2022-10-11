import * as vscode from 'vscode';
import { createFile, createFolder, dxmateOutput, execShell, folderExists, getFile, ShellCommand, workspacePath } from './utils';

function getPackageKeys() {
    let keyParams = '';
    let dependencyKeys = getDependencyKeys();

    //Check if dependencies exists
	//Possibly support for mulit package directories?
    if(dependencyKeys) {
        dependencyKeys.forEach((dependency: any) => {
			dxmateOutput.appendLine('DEPENDENCY:  ' + dependency.packageName);
            keyParams += dependency.packageName + ':' + dependency.packageKey + ' ' ;
        });
		dxmateOutput.show();
    }

    return keyParams;
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
		value: "0.1.0.LATEST",
	});
}

function addDependencyGetPackageIdInput() {
    return vscode.window.showInputBox({
		title: 'Package ID',
		placeHolder: "ID",
	});
}

async function validateDependencies() {
    return new Promise<string>(async (resolve, reject) => {
        //Check if all the registered dependencies has been defined in dependencyKeys
        let projDependencies = getDependencies();
        let dependencyKeys = getDependencyKeys();
        const startInstall = () => {
            resolve('START INSTALL');
        }

        dxmateOutput.appendLine('FOUND DEPENDENCIES: ' + JSON.stringify(projDependencies));
        let mappedPackages = new Set();

        if(!projDependencies) { 
            resolve('No dependencies');
        }
        if(dependencyKeys !== null) {
            dependencyKeys.forEach((depKey: any) => {
                mappedPackages.add(depKey.packageName);
            });
        }

        for (const dependency of projDependencies) {
            if(!mappedPackages.has(dependency.package)) {
                //If not mapped, prompt user to input a key for this package
                await updateDependencyKey(dependency.package);
            }
        }

        startInstall();
    });
}

function updateDependencyKey(packageName: string) {
    return new Promise<string>((resolve, reject) => {
        vscode.window.showInputBox({
        title: 'Update package key for package: <' + packageName + '>',
        placeHolder: "KEY",
        }).then(value => {
            let packageKey = value as string;
            addToDependencyKeys(packageName, packageKey);
            resolve('Added key');
        });
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
export async function inputUpdateDependencyKey() {
	let dependencies = getDependencies();

	if(!dependencies) {
		dxmateOutput.appendLine('No registered dependencies in sfdx-project.json');
		dxmateOutput.show();
		return;
	} else{
		if(!folderExists(workspacePath + '/dxmate_config')) { 
			createFolder(workspacePath + '/dxmate_config');
		}
        let dependencyList = new Array();
		dependencies.forEach((dependency: any) => {
			dependencyList.push(dependency.package);
		});
        vscode.window.showQuickPick(dependencyList, {
            title: 'Select dependency',
            canPickMany: false
        }).then(selectedPackage => {
            updateDependencyKey(selectedPackage);
        });
	}
}

//utilizes sfpowerkit to install dependencies. Might need to have an install script to install this automatically

//TODO: INCLUDE EXTRA CHECK IF THE PROCESS TRIES TO INSTALL DEPENDENCIES IN A SANDBOX/FIND A WAY TO --updateOnly
export async function installDependencies() {
	let dependencies = getDependencies();

	if(!dependencies) {
		//No dependencies
		dxmateOutput.appendLine('No Dependencies to install');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('No Dependencies');
		});
	}
    await validateDependencies();
    let keyParams = getPackageKeys(); //Get package.json, and find dependencies. keysParam must be a list 

	//Verify sfpowerkit is installed, or else rund the installation
	let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10 --installationkeys \"' + keyParams + '\"';

	dxmateOutput.appendLine('INSTALLING DEPENDENCIES');
    dxmateOutput.show();

	let shellCommand = execShell(cmd) as ShellCommand;

	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		cancellable: true,
		title: 'Running sfpowerkit dependency install'
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			shellCommand.shellProcess.kill("SIGINT");
		});
		progress.report({  message: 'Installing package dependencies' });
		await shellCommand.shellPromise;
	});

	return shellCommand.shellPromise;
}