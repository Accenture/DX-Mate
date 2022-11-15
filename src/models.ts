import * as vscode from 'vscode';
import { RunningTaskProvider } from './RunningTaskProvider';
import { IS_MULTI_PCKG_DIRECTORY, refreshRunningTasks, SFDX_PROJECT_JSON, ShellCommand } from "./utils";

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
    jobStartTime?: Date;
    jobEndTime?: Date;
    shellCommand?: ShellCommand;
    subJobs: Job[] = [];
    currentSubJobIndex = 0;

    public async startJob() {
        this.jobStatus = JobStatus.IN_PROGRESS;
        this.refreshIcon();
        this.jobStartTime = new Date();
        if(this.hasSubJobs() === true) {
            while(this.hasNextSubJob()) {
                await this.runNextSubJob();
            }
        }
        this.shellCommand?.runCommand().shellPromise?.then( () => {
            this.jobCompleted();
        })
        .catch(err => {
            console.log('JOB FAILED');
            this.jobFailed();
        })
        .finally(() => {
            console.log('FINALLY CALLED');
            this.jobEndTime = new Date();
            this.refreshIcon();
        });
        this.setProgressState();
        return this.shellCommand?.shellPromise;
    }
    
    private jobFailed() {
        this.jobStatus = JobStatus.ERROR;
    }

    private jobCompleted() {
        this.jobStatus = JobStatus.SUCCESS;
    }

    private refreshIcon() {
        this.iconPath = this.getIcon();
        refreshRunningTasks();
    }

    public addJob(job: Job) {
        this.subJobs.push(job);
    }

    private hasSubJobs(): boolean {
        return this.subJobs.length > 0;
    }

    private hasNextSubJob() {
        return this.currentSubJobIndex > this.subJobs.length;
    }

    private runNextSubJob() {
        this.currentSubJobIndex++;
        return this.subJobs[this.currentSubJobIndex].startJob();
    }

    private setProgressState() {
        vscode.window.withProgress(
            {
                location: { viewId: 'runningTasks' },
                cancellable: false
            },
            async (progress) =>
            {
                await this.shellCommand?.shellPromise;
            });
    }

    constructor(jobName: string, shellCommand?: ShellCommand) {
        super(jobName, vscode.TreeItemCollapsibleState.None);
        if(shellCommand !== undefined) {this.shellCommand = shellCommand;}
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
    private static currentJobIndex = -1;

    public static hasNextJob(): boolean {
        return this.currentJobIndex < this.jobs.length;
    }

    public static runNextJob() {
        this.currentJobIndex++;
        return this.jobs[this.currentJobIndex].startJob();
    }

    public static setRunningTaskProvider(runningTaskProvider: RunningTaskProvider) {
        this.runningTaskProvider = runningTaskProvider;
    }

    public static refreshRunningTasks() {
        this.runningTaskProvider.refresh();
    }

    public static addJob(job: Job) {
        this.jobs.push(job);
        this.refreshRunningTasks();
    }

    public static clearJobs() {
        this.jobs = [];
    }
}