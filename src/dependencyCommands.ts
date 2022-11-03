import * as vscode from "vscode";
import { DependencyKey, EXTENSION_CONTEXT, PackageDirectory, Dependency } from "./models";
import { createFile, createFolder, dxmateOutput, folderExists, getFile, workspacePath } from "./utils";
import { getPackageDirectory, getPackageDirectories, getPackageDirectoryInput } from "./workspace";

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

function addDependencyGetPackageDirectoryInput() {
    if(EXTENSION_CONTEXT.isMultiPackageDirectory === true) {
        return getPackageDirectoryInput();
    } else{
        return getPackageDirectories()[0];
    }
}

/**
 * Starts process to add new dependency to project
 * 1. Get package directory input
 * 2. Get package name of new dependency as input
 * 3. Get version number of new dependency as input
 * 4. Get package ID of new dependency as input
 * 5. Get package key of new dependency as input
 */
export async function addDependency() {
    //If any of the input steps are cancelled the whole process stops
    let packageDirectory = await addDependencyGetPackageDirectoryInput() as PackageDirectory;
    if(!packageDirectory) {return;}
    let dependencyName = await addDependencyGetPackageNameInput() as string;
    if(!dependencyName) {return;}
    let packageVersion = await addDependencyGetPackageVersionInput() as string;
    if(!packageVersion) {return;}
    let packageId = await addDependencyGetPackageIdInput() as string;
    if(!packageId) {return;}
    let packageKey = await addDependencyGetPackageKeyInput() as string;
    if(!packageKey) {return;}

    addToProjDependencies(packageDirectory, dependencyName, packageVersion, packageId);
    addToDependencyKeys(dependencyName, packageKey);
}

//Adds a new dependency to the sfdx-project.json. If already existing as dependency, the version is overwritten
function addToProjDependencies(packageDirectory: PackageDirectory, dependencyName: string, packageVersion: string, packageId: string) {
    let packageDependencies = packageDirectory.dependencies;
    let added = false;
    if(!packageDependencies) {
        packageDependencies = [];
    }

    packageDependencies.forEach((dependency: Dependency) => {
        if(dependency.package === dependencyName && packageVersion === packageVersion) {
            added = true;
        }
    });

    if(!added) {
        const projFile = getFile(workspacePath + '/sfdx-project.json') as string;
        let projJson = JSON.parse(projFile);

        packageDependencies.push({package: dependencyName, versionNumber: packageVersion});

        for (let index = 0; index < projJson.packageDirectories.length; index++) {
            const directory = projJson.packageDirectories[index] as PackageDirectory;
            if(directory.package === packageDirectory.package) {
                projJson.packageDirectories[index].dependencies = packageDependencies;
                break; 
            }
        }
        projJson.packageAliases[dependencyName] = packageId;

        createFile(workspacePath + '/sfdx-project.json', JSON.stringify(projJson, null, 4));
    }
}

export function updateDependencyKey(packageName: string) {
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

/**
 * Updates the dependencyKeys.json with new packageName packageKey pair
 * @param packageName 
 * @param packageKey 
 */
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

//Creates the config folder if it is not already present
function createConfigFolder() {
    if(!folderExists(workspacePath + '/dxmate_config')) {
        createFolder(workspacePath + '/dxmate_config');
    }
}

/**
 * Get the dependency keys defined in the config file.
 * @returns 
 */
 export function getDependencyKeys() {
	const depFile = getFile(workspacePath + '/dxmate_config/dependencyKeys.json');
    return depFile ? JSON.parse(depFile) as DependencyKey[] : null;  
}

/**
 * 
 * @param packageName (Name of package to get dependency list for from project.json folder)
 * @returns Object[] 
 */
 export function getDependencies(packageName: string) {
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