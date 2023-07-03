import * as vscode from 'vscode';
import { getFile, getFilesInDirectory } from '../utils';


export function generateFieldMarkdown(target: vscode.Uri) {
    const tableHeader = '|  API Name  | Type  | Description  |\n|---|---|---|\n';
    let fieldTable = tableHeader;

    let files = getFilesInDirectory(target.fsPath);
    files.forEach(fileName => {
        let fileContent = getFile(target.fsPath + '/' + fileName) as string;
        fieldTable += rowifyField(fileContent);
    });
    createTextDocument(fieldTable);
}

/**
 * Takes a xml field string as input and returns a table row markdown representation
 * @param field 
 */
function rowifyField(field: string) {
    let apiName, type, description;
    const xmlRegex = /<(\w*)>(.*)<\/\w*>/g;
    const matches = field.matchAll(xmlRegex);
    for (const match of matches) {
        if(match[1] === 'fullName' && !apiName) {
            apiName = match[2];
            continue;
        }
        else if(match[1] === 'type' && !type) {
            type = match[2];
            continue;
        }
        else if(match[1] === 'description' && !description) {
            description = match[2];
            continue;
        }
    }

    return `|  ${apiName}  | ${type}  | ${description}  |\n`;
}

/**
 * 
 * @param content created and opens a new text document with generated content
 */
function createTextDocument(content: string) {
    vscode.workspace.openTextDocument( {
        language: 'text',
        content: content
    } )
    .then( doc => {
        vscode.window.showTextDocument(doc);
    });
}