import * as vscode from 'vscode';
import { RunningTaskProvider } from './RunningTaskProvider';
import { IS_MULTI_PCKG_DIRECTORY, SFDX_PROJECT_JSON } from "./utils";

export class PackageDirectory {
    path: string = '';
    default: boolean = false;
    package: string = '';
    versionName: string = '';
    versionNumber: string = '';
    dependencies: Dependency[] = []; //Object with properties "package", and "versionNumber"
}

export class Dependency {
    package: string = '';
    versionNumber: string = '';
}

export class DependencyKey {
    packageName: string = '';
    packageKey: string = '';

    constructor(packageName: string, packageKey: string) {
        this.packageKey = packageKey;
        this.packageName = packageName;
    }
}

export class Job extends vscode.TreeItem{
    jobName: string = '';
    jobStatus: JobStatus = JobStatus.SCHEDULED;

    constructor(jobName: string, jobStatus?: JobStatus) {
        super(jobName, vscode.TreeItemCollapsibleState.None);
        
        if(jobStatus !== undefined) { 
            this.jobStatus = jobStatus; 
        }
        this.iconPath = this.getIcon();
    }

    getIcon() {
        switch (this.jobStatus) {
            case JobStatus.IN_PROGRESS:
                return new vscode.ThemeIcon('loading~spin');
            case JobStatus.SUCCESS:
                return new vscode.ThemeIcon('testing-passed-icon');
            case JobStatus.ERROR:
                return new vscode.ThemeIcon('error');
            default:
                return new vscode.ThemeIcon('testing-queued-icon');
        }
    }
}
// eslint-disable-next-line
export enum JobStatus {IN_PROGRESS, ERROR, SUCCESS, SCHEDULED}
// eslint-disable-next-line
export abstract class EXTENSION_CONTEXT {
	public static  get isMultiPackageDirectory(): boolean { return IS_MULTI_PCKG_DIRECTORY();}
    public static get projJson(): string { return SFDX_PROJECT_JSON();}
    public static jobs: Job[] = [];
    private static runningTaskProvider: RunningTaskProvider;

    public static setRunningTaskProvider(runningTaskProvider: RunningTaskProvider) {
        this.runningTaskProvider = runningTaskProvider;
    }

    public static refreshRunningTasks() {
        this.runningTaskProvider.refresh();
    }

    public static addJob(job: Job) {
        this.jobs.push(job);
    }

    public static clearJobs() {
        this.jobs = [];
    }
}