import * as vscode from 'vscode';
import { createFile, createFolder, dxmateOutput, execShell, folderExists, getFile, ShellCommand, workspacePath } from './utils';

const SFDX_PROJECT_JSON =  getFile(workspacePath + '/sfdx-project.json') as string;
export const IS_MULTI_PCKG_DIRECTORY = () => {
    let projJson = JSON.parse(SFDX_PROJECT_JSON);
    return projJson?.packageDirectories?.length > 1;
};

/**
 * Gets the keys for the packages that the input packageName depends on if defined in config file
 * @param packageName 
 * @returns string (Formatted as required for input to sfpowerkit install dependencies command)
 */
function getPackageKeys(packageName: string) {
    let keyParams = '';
    let dependencyKeys = getDependencyKeys() as DependencyKey[];
    const packageDependencies = getDependencies(packageName);

    if(packageDependencies && dependencyKeys) {
        packageDependencies.forEach(packageDependency => {
            let dependencyKey = dependencyKeys.find((depKey) => {
                return depKey.packageName === packageDependency.package;
            });
            if(dependencyKey) {
                dxmateOutput.appendLine('DEPENDENCY:  ' + dependencyKey.packageName);
                keyParams += dependencyKey.packageName + ':' + dependencyKey.packageKey + ' ' ;
            }
        });
    }
    dxmateOutput.show();

    return keyParams;
}

/**
 * 
 * @param packageName (Name of package to get dependency list for from project.json folder)
 * @returns Object[] 
 */
function getDependencies(packageName: string) {
    return getPackageDirectory(packageName)?.dependencies;
}

/**
 * Get the collective list of dependencies from all package directories
 */
function getProjectDependencies() {
    let dependencies = new Set<string>();
    const packageDirectories = getPackageDirectories();
    packageDirectories.forEach(directory => {
        directory.dependencies.forEach(dependency => {
            dependencies.add(dependency.package);
        });
    });
    console.log('PROJECT DEPENDENCIES');
    console.log(dependencies);
    return dependencies;
}

/**
 * 
 * @returns PackageDirectory[] Model defined in models.ts
 */
export function getPackageDirectories() {
    let projJson = JSON.parse(SFDX_PROJECT_JSON);
    return projJson?.packageDirectories as PackageDirectory[];
}

/**
 * Return the package directory for an input packageName
 * @param packageName 
 * @returns PackageDirectory
 */
function getPackageDirectory(packageName: string) {
    const projDirecotries = getPackageDirectories() as PackageDirectory[];
    for (let index = 0; index < projDirecotries.length; index++) {
        const directory = projDirecotries[index];
        if(directory?.package === packageName) {
            console.log('Directory dependencies is: ' + JSON.stringify(directory.dependencies, null, 2));
            return directory;
        }
    }
}

/**
 * Get the dependency keys defined in the config file.
 * @returns 
 */
function getDependencyKeys() {
	const depFile = getFile(workspacePath + '/dxmate_config/dependencyKeys.json');
    return depFile ? JSON.parse(depFile) as DependencyKey[] : null;  
}

//Creates the config folder if it is not already present
function createConfigFolder() {
    if(!folderExists(workspacePath + '/dxmate_config')) {
        createFolder(workspacePath + '/dxmate_config');
    }
}

//Adds a new dependency to the sfdx-project.json. If already existing as dependency, the version is overwritten
function addToProjDependencies(packageName: string, dependencyName: string, packageVersion: string, packageId: string) {
    let projDependencies = getDependencies(packageName);
    let added = false;
    if(!projDependencies) {
        projDependencies = [];
    }

    projDependencies.forEach((dependency: any) => {
        if(dependency.package === dependencyName && packageVersion === packageVersion) {
            added = true;
        }
    });

    if(!added) {
        const projFile = getFile(workspacePath + '/sfdx-project.json') as string;
        let jsonData = JSON.parse(projFile);

        projDependencies.push({package: dependencyName, versionNumber: packageVersion});
        jsonData.packageDirectories[0].dependencies = projDependencies;
        jsonData.packageAliases[dependencyName] = packageId;

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

async function validateDependencies(packageName: string) {
    return new Promise<string>(async (resolve, reject) => {
        //Check if all the registered dependencies has been defined in dependencyKeys
        let projDependencies = getDependencies(packageName);
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
            if(!value) {
                console.log('Cancelled key input');
                return;
            }
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
		let dependencyName = await addDependencyGetPackageNameInput() as string;
        let packageVersion = await addDependencyGetPackageVersionInput() as string;
        let packageId = await addDependencyGetPackageIdInput() as string;
        let packageKey = await addDependencyGetPackageKeyInput() as string;

        addToProjDependencies(null, dependencyName, packageVersion, packageId);
        addToDependencyKeys(dependencyName, packageKey);
}

//Updating config file with input package key
export async function inputUpdateDependencyKey() {
	let dependencies = getProjectDependencies();

	if(!dependencies) {
		dxmateOutput.appendLine('No registered dependencies in sfdx-project.json');
		dxmateOutput.show();
		return;
	} else{
		if(!folderExists(workspacePath + '/dxmate_config')) { 
			createFolder(workspacePath + '/dxmate_config');
		}
        let dependencyList = new Array();
		dependencies.forEach((dependencyname: string) => {
			dependencyList.push(dependencyname);
		});
        vscode.window.showQuickPick(dependencyList, {
            title: 'Select dependency',
            canPickMany: false
        }).then(selectedPackage => {
            if(!selectedPackage) {
                //Cancelled
                return;
            }
            updateDependencyKey(selectedPackage);
        });
	}
}

export async function getPackageDirectoryInput() {
	let directories = getPackageDirectories();
	let dirMap = new Map();
	let packageNames: string[] = [];

	if(directories && directories.length > 0) {
		directories.forEach(directory => {
			dirMap.set(directory.package, directory);
			packageNames.push(directory.package);
		});
		console.log(packageNames);
	}
	else{
		dxmateOutput.appendLine('Error getting package directories');
		return;
	}

	return vscode.window.showQuickPick(packageNames, {
		title: 'Select package directory',
		canPickMany: false,
	}).then((selectedDirectory) => {
		return selectedDirectory ? dirMap.get(selectedDirectory) : null;
	});
}

/**
 * Prompts user for input to select which package to install dependencies for and initiates the install
 */
export async function installDependenciesForPackage() {
    let packageDirectory: PackageDirectory;
    if(IS_MULTI_PCKG_DIRECTORY() === true) {
        packageDirectory = await getPackageDirectoryInput() as PackageDirectory;

		if(!packageDirectory) {
			return; //User cancelled
		}
    }
    else{
		packageDirectory = getPackageDirectories()[0];
	}

    return installDependencies(packageDirectory.package);
}

//utilizes sfpowerkit to install dependencies. Might need to have an install script to install this automatically

//TODO: INCLUDE EXTRA CHECK IF THE PROCESS TRIES TO INSTALL DEPENDENCIES IN A SANDBOX/FIND A WAY TO --updateOnly
export async function installDependencies(packageName: string) {
	let dependencies = getDependencies(packageName);

	if(!dependencies) {
		//No dependencies
		dxmateOutput.appendLine('No Dependencies to install');
		dxmateOutput.show();
		return new Promise<string>((resolve, reject) => {
			resolve('No Dependencies');
		});
	}
    await validateDependencies();
    let keyParams = getPackageKeys(packageName); //Get package.json, and find dependencies. keysParam must be a list 

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