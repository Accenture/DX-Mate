"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPackageKey = exports.importDummyData = exports.deployUnpackagable = exports.assignPermsets = exports.sourcePullMetadata = exports.sourcePushMetadata = exports.installDependencies = exports.openScratchOrg = exports.createScratchOrg = void 0;
const vscode = require("vscode");
const utils_1 = require("./utils");
//Creates a new scratch org based on name input. Default duration is set to 5 days
function createScratchOrg(scratchName) {
    let cmd = 'sfdx force:org:create ' +
        "-f ./config/project-scratch-def.json " +
        "--setalias " + scratchName +
        " --durationdays 5 " +
        "--setdefaultusername";
    let shellPromise = (0, utils_1.execShell)(cmd);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Running sfdx force:org:create'
    }, async (progress) => {
        progress.report({ message: 'Creating scratch org' });
        await shellPromise;
    });
    return shellPromise;
}
exports.createScratchOrg = createScratchOrg;
//Opens the default scratch org
function openScratchOrg() {
    let cmd = 'sfdx force:org:open';
    let shellPromise = (0, utils_1.execShell)(cmd);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Running sfdx force:org:open'
    }, async (progress) => {
        progress.report({ message: 'Opening default org' });
        await shellPromise;
    });
    return shellPromise;
}
exports.openScratchOrg = openScratchOrg;
//utilizes sfpowerkit to install dependencies. Might need to have an install script to install this automatically
function installDependencies() {
    let keyParams = getPackageKeys(); //Get package.json, and find dependencies. keysParam must be a list 
    //Verify sfpowerkit is installed, or else rund the installation
    let cmd = 'sfdx sfpowerkit:package:dependencies:install -r -a -w 10 --installationkeys ' + keyParams;
    utils_1.einsteinOutput.appendLine('FULL COMMAND:  ' + cmd);
    utils_1.einsteinOutput.show();
    let shellPromise = (0, utils_1.execShell)(cmd);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Running sfpowerkit dependency install'
    }, async (progress) => {
        progress.report({ message: 'Installing package dependencies' });
        shellPromise;
    });
    return shellPromise;
}
exports.installDependencies = installDependencies;
function getPackageKeys() {
    let packageKey = getPackageKey();
    let keyParams = '';
    const projFile = (0, utils_1.getFile)(utils_1.workspacePath + '/sfdx-project.json');
    let jsonData = JSON.parse(projFile);
    //Check if dependencies exists
    //Possibly support for mulit package directories?
    if (jsonData.packageDirectories[0].dependencies) {
        jsonData.packageDirectories[0].dependencies.forEach((dependency) => {
            utils_1.einsteinOutput.appendLine('DEPENDENCY:  ' + dependency.package);
            keyParams += dependency.package + ':' + packageKey + ' ';
        });
        utils_1.einsteinOutput.show();
    }
    return keyParams;
}
//Get the package key stored in einstein_config. See if we need to support package key per dependency
function getPackageKey() {
    return (0, utils_1.getFile)(utils_1.workspacePath + '/einstein_config/.packageKey');
}
//push metadata from scratch org
function sourcePushMetadata() {
    let cmd = 'sfdx force:source:push';
    let shellPromise = (0, utils_1.execShell)(cmd);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Running source push'
    }, async (progress) => {
        progress.report({ message: 'Pushing metadata' });
        shellPromise;
    });
    return shellPromise;
}
exports.sourcePushMetadata = sourcePushMetadata;
//Pull metadata from scratch org
function sourcePullMetadata() {
    let cmd = 'sfdx force:source:pull';
    let shellPromise = (0, utils_1.execShell)(cmd);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Running source pull'
    }, async (progress) => {
        progress.report({ message: 'Pulling metadata' });
        shellPromise;
    });
    return shellPromise;
}
exports.sourcePullMetadata = sourcePullMetadata;
//Assings all default permission sets defined in the workspace settings
function assignPermsets() {
    //Get the permets to assign på default by reading json config file.
    let permsets = vscode.workspace.getConfiguration().get('scratch.default.permissionsets');
    let promiseList = new Array();
    if (permsets.length > 0) {
        permsets.forEach(permset => {
            let cmd = 'sfdx force:user:permset:assign -n ' + permset;
            promiseList.push((0, utils_1.execShell)(cmd));
        });
    }
    return Promise.all(promiseList);
}
exports.assignPermsets = assignPermsets;
//Get configuration and deploys metadata that is stored in the unpackagable location
function deployUnpackagable() {
    //Get path to unpackagable and deploy
    let unpackPath = vscode.workspace.getConfiguration().get('unpackagable.location');
    let shellPromise = (0, utils_1.execShell)('sfdx force:source:deploy -p ' + unpackPath);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Deploying unpackagable'
    }, async (progress) => {
        progress.report({ message: 'Deploying metadata from: ' + unpackPath });
        await shellPromise;
    });
    return shellPromise;
}
exports.deployUnpackagable = deployUnpackagable;
//Iterates all folder in the dummy data folder to run sfdx import using the plan.json file
function importDummyData() {
    let dummyDataFolder = vscode.workspace.getConfiguration().get('dummy.data.location');
    let directories = (0, utils_1.getDirectories)(utils_1.workspacePath + dummyDataFolder);
    let promiseArray = new Array();
    directories.forEach((dataDirectory) => {
        let planJsonPath = utils_1.workspacePath + dummyDataFolder + '/' + dataDirectory + '/plan.json';
        let cmd = 'sfdx force:data:tree:import --plan ' + planJsonPath;
        promiseArray.push((0, utils_1.execShell)(cmd));
    });
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'Importing dummy data'
    }, async (progress) => {
        progress.report({ message: 'Running dummy data import' });
        await Promise.all(promiseArray);
    });
}
exports.importDummyData = importDummyData;
//Updating config file with input package key
function addPackageKey() {
    vscode.window.showInputBox({
        title: 'Package key',
        placeHolder: "KEY",
    }).then(value => {
        if (value) {
            (0, utils_1.createFile)(utils_1.workspacePath + '/einstein_config/.packageKey', value);
        }
    });
}
exports.addPackageKey = addPackageKey;
//# sourceMappingURL=commands.js.map