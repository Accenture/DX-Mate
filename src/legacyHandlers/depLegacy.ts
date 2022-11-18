import * as vscode from "vscode";
import { DependencyKey } from "../models";
import { execShell, getFile, workspacePath } from "../utils";


/**
 * Get the dependency keys defined in the config file.
 * @returns 
 */
function getDependencyKeysLegacy() {
	const depFile = getFile(workspacePath + '/dxmate_config/dependencyKeys.json');
    return depFile ? JSON.parse(depFile) as DependencyKey[] : null;  
}

export function depKeyMigrator() {
    let legacyKeys = getDependencyKeysLegacy();
    if(legacyKeys) {
        vscode.window.showWarningMessage(
            'Deprecated use of the dxmate_config detected. Dependency keys are to be stored in extension settings. Convert and delete deprecated folder?',
            ...['Yes', 'No']
        )
        .then(value => {
            if(value === 'Yes') {
                handleDepKeyLegacyMigration(legacyKeys as DependencyKey[]);
            }
        });
    }
}

function handleDepKeyLegacyMigration(legacyKeys: DependencyKey[]) {
    let currentConfig = vscode.workspace.getConfiguration().get('dependency.keys') as vscode.WorkspaceConfiguration;

    
    let newConfig: any = {};
    //Assign all existing keys if there are any
    if(currentConfig) { Object.assign(newConfig, currentConfig); }
    legacyKeys.forEach(legacyKey => {
        //Add all keys from legacy file
        newConfig[legacyKey.packageName] = legacyKey.packageKey;
    });

    vscode.workspace.getConfiguration().update('dependency.keys', newConfig, vscode.ConfigurationTarget.Global).then( out => {
        //When successfull, we delete the dxmate_config folder with the content
        execShell('rm -r ' + workspacePath + '/dxmate_config');
    });
}