import * as vscode from 'vscode';
import { getDependencyKeys, getDependencies, updateDependencyKey } from './dependencyCommands';
import { DependencyKey, PackageDirectory, Dependency, EXTENSION_CONTEXT } from './models';
import { createFile, dxmateOutput, execShell, getFile, ShellCommand, workspacePath } from './utils';
import { getPackageDirectoryInput, getPackageDirectories } from './workspace';

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

async function validateDependencies(packageName: string) {
    return new Promise<string>(async (resolve, reject) => {
        //Check if all the registered dependencies has been defined in dependencyKeys
        let packageDependencies = getDependencies(packageName);
        let dependencyKeys = getDependencyKeys();
        const startInstall = () => {
            resolve('START INSTALL');
        }

        dxmateOutput.appendLine('FOUND DEPENDENCIES: ' + JSON.stringify(packageDependencies));
        let mappedPackages = new Set();

        if(!packageDependencies) { 
            resolve('No dependencies');
            return;
        }
        if(dependencyKeys !== null) {
            dependencyKeys.forEach((depKey: any) => {
                mappedPackages.add(depKey.packageName);
            });
        }

        for (const dependency of packageDependencies) {
            if(!mappedPackages.has(dependency.package)) {
                //If not mapped, prompt user to input a key for this package
                await updateDependencyKey(dependency.package);
            }
        }

        startInstall();
    });
}

/**
 * Prompts user for input to select which package to install dependencies for and initiates the install
 */
export async function installDependenciesForPackage() {
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
    await validateDependencies(packageName);
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