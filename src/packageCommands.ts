import { getDependencyKeys, getDependencies, updateDependencyKey } from './dependencyCommands';
import { DependencyKey, PackageDirectory, EXTENSION_CONTEXT, Job } from './models';
import {dxmateOutput, ShellCommand } from './utils';
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
        let dependencyKeys = getDependencyKeys() as DependencyKey[];
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

//TODO: INCLUDE EXTRA CHECK IF THE PROCESS TRIES TO INSTALL DEPENDENCIES IN A SANDBOX/FIND A WAY TO --updateOnly
export function installDependencies(packageName: string) {
    installDependenciesJob(packageName).then( jobsReady => {
        //If the resolved value is true we start the jobs
        if(jobsReady === true) {
            EXTENSION_CONTEXT.startJobs();
        }
    });
}

/**
 * Submits the install dependencies job after validation. Returns a boolean promise that resolves to true if the job was added
 * @param packageName 
 * @returns 
 */
export async function installDependenciesJob(packageName: string) {
    let dependencies = getDependencies(packageName);

	if(!dependencies) {
		//No dependencies
		dxmateOutput.appendLine('No Dependencies to install');
		dxmateOutput.show();
		return new Promise<boolean>((resolve, reject) => {
			resolve(false);
		});
	}
    return new Promise<boolean>(async (resolve, reject) => {
        await validateDependencies(packageName);
        let keyParams = getPackageKeys(packageName); //Get package.json, and find dependencies. keysParam must be a list 
    
        //Verify sfpowerkit is installed, or else rund the installation
        let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10 --installationkeys \"' + keyParams + '\"';
    
        let shellJob = new Job('Install Dependencies', new ShellCommand(cmd));
        EXTENSION_CONTEXT.addJob(shellJob);
        resolve(true);
    });
}