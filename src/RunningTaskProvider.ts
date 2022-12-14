import * as vscode from 'vscode';
import { EXTENSION_CONTEXT, Job } from './models';

export class RunningTaskProvider implements vscode.TreeDataProvider<Job> {
  getTreeItem(element: Job): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Job): Thenable<Job[]> {
    if(element) {
      return Promise.resolve(element.subJobs);
    }
    else{
      return Promise.resolve(EXTENSION_CONTEXT.jobs);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Job | undefined | null | void> = new vscode.EventEmitter<Job | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Job | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
