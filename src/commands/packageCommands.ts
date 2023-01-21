import { getDependencyKeys, updateDependencyKey, getProjectDependencies } from './dependencyCommands';
import { DependencyKey, EXTENSION_CONTEXT, Job } from '../models';
import {dxmateOutput, ShellCommand } from '../utils';

/**
 * Gets the keys for the packages that the project depends on if defined in config file
 * @param packageName 
 * @returns string (Formatted as required for input to sfpowerkit install dependencies command)
 */
function getPackageKeys() {
    let keyParams = '';
    let dependencyKeys = getDependencyKeys() as DependencyKey[];
    const projDependencies = getProjectDependencies();

    if(projDependencies && dependencyKeys) {
        projDependencies.forEach(packageDependency => {
            let dependencyKey = dependencyKeys.find((depKey) => {
                return depKey.packageName === packageDependency;
            });
            if(dependencyKey) {
                dxmateOutput.appendLine('DEPENDENCY:  ' + dependencyKey.packageName);
                //Only add to keyparams if there is actually a key defined
                if(dependencyKey.packageKey.length > 0) {
                    keyParams += dependencyKey.packageName + ':' + dependencyKey.packageKey + ' ' ;
                }
            }
        });
    }
    dxmateOutput.show();

    return keyParams;
}

async function validateDependencies() {
    return new Promise<string>(async (resolve, reject) => {
        //Check if all the registered dependencies has been defined in dependencyKeys
        let packageDependencies = getProjectDependencies() as Set<string>;
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
            if(!mappedPackages.has(dependency)) {
                //If not mapped, prompt user to input a key for this package
                await updateDependencyKey(dependency);
            }
        }

        startInstall();
    });
}

//TODO: INCLUDE EXTRA CHECK IF THE PROCESS TRIES TO INSTALL DEPENDENCIES IN A SANDBOX/FIND A WAY TO --updateOnly
export function installDependencies() {
    installDependenciesJob().then( jobsReady => {
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
export async function installDependenciesJob() {
    let dependencies = getProjectDependencies();

	if(!dependencies) {
		//No dependencies
		dxmateOutput.appendLine('No Dependencies to install');
		dxmateOutput.show();
		return new Promise<boolean>((resolve, reject) => {
			resolve(false);
		});
	}
    return new Promise<boolean>(async (resolve, reject) => {
        await validateDependencies();
        let keyParams = getPackageKeys(); //Get package.json, and find dependencies. keysParam must be a list 
    
        //Verify sfpowerkit is installed, or else run the installation
        let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10';
        cmd += keyParams.length > 0 ? ' --installationkeys \"' + keyParams + '\"' : '';
    
        let shellJob = new Job('Install Dependencies', new ShellCommand(cmd));
        EXTENSION_CONTEXT.addJob(shellJob);
        resolve(true);
    });
}