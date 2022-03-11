"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const commands_1 = require("./commands");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // The command has been defined in the package.json file
    registerOrgCommands(context);
}
exports.activate = activate;
function registerOrgCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand('einstein.openScratch', () => {
        (0, commands_1.openScratchOrg)();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('einstein.createScratch', () => {
        setupScratchOrg();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('einstein.dependencyInstall', () => {
        (0, commands_1.installDependencies)();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('einstein.addPackageKey', () => {
        (0, commands_1.addPackageKey)();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('einstein.importDummyData', () => {
        (0, commands_1.importDummyData)();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('einstein.assignPermissionsets', () => {
        (0, commands_1.assignPermsets)();
    }));
}
function setupScratchOrg() {
    vscode.window.showInputBox({
        title: 'Scratch org alias',
        placeHolder: "MYSCRATCH",
    }).then(value => {
        (0, commands_1.createScratchOrg)(value).then(out => {
            (0, commands_1.installDependencies)().then(out => {
                (0, commands_1.sourcePushMetadata)().then(out => {
                    (0, commands_1.deployUnpackagable)().then(out => {
                        (0, commands_1.openScratchOrg)();
                        //Automatically assign default permission sets. This needs to complete before importing dummy data
                        (0, commands_1.assignPermsets)().then(out => {
                            (0, commands_1.importDummyData)();
                        });
                    });
                });
            });
        });
    });
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map