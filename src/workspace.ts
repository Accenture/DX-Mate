//Containing reusable functions for gettin information and files from the current workspace
import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, PackageDirectory } from "./models";
import { dxmateOutput } from "./utils";

/**
 * 
 * @returns PackageDirectory[] Model defined in models.ts
 */
 export function getPackageDirectories() {
    let projJson = JSON.parse(EXTENSION_CONTEXT.projJson);
    return projJson?.packageDirectories as PackageDirectory[];
}

/**
 * Return the package directory for an input packageName
 * @param packageName 
 * @returns PackageDirectory
 */
export function getPackageDirectory(packageName: string) {
    const projDirecotries = getPackageDirectories() as PackageDirectory[];
    for (let index = 0; index < projDirecotries.length; index++) {
        const directory = projDirecotries[index];
        if(directory?.package === packageName) {
            console.log('Directory dependencies is: ' + JSON.stringify(directory.dependencies, null, 2));
            return directory;
        }
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