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

export default interface ScratchOrg {
    failureMessage?: string;
    tag?: string;
    recordId?: string;
    orgId?: string;
    loginURL?: string;
    signupEmail?: string;
    username?: string;
    alias?: string;
    password?: string;
    isScriptExecuted?: boolean;
    expiryDate?: string;
    accessToken?: string;
    instanceURL?: string;
    status?: string;
    sfdxAuthUrl?: string;
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
    onJobFinish?: any;
    currentSubJobIndex = -1;

    public async startJob() {
        this.jobStatus = JobStatus.IN_PROGRESS;
        this.refreshIcon();
        this.jobStartTime = new Date();
        if(this.hasSubJobs() === true) {
            console.log('HAS SUBJOBS');
            while(this.hasNextSubJob()) {
                try{
                    await this.runNextSubJob();
                }
                catch(exception) {
                    console.error('DXMATE:JobException: ' + JSON.stringify(exception, null, 2));
                    if(exception === 'Cancel') {
                        this.jobFailed();
                        this.cancel();
                        return new Promise<string>((resolve, reject) => {
                            reject('Subjob rejected');
                        });
                    }
                }
            }
            this.jobCompleted();
            return new Promise<string>((resolve, reject) => {
                resolve('All jobs completed');
            });
        }
        else{
            this.shellCommand?.runCommand().shellPromise?.then( () => {
                this.jobCompleted();
            })
            .catch(err => {
                console.log('JOB FAILED');
                this.jobFailed();
            })
            .finally(() => {
                console.log('FINALLY CALLED');
            });
            this.setProgressState();
            return this.shellCommand?.shellPromise;
        }
    }

    public cancel() {
        console.log('CANCELLING JOB');
        if(this.subJobs.length > 0) {
            this.subJobs.forEach(subJob => {
                subJob.cancel();
            });
        }
        this.shellCommand?.shellProcess?.kill('SIGINT');
        this.jobStatus = JobStatus.CANCELLED;
        this.refreshIcon();
    }
    
    private jobFailed() {
        this.jobStatus = JobStatus.ERROR;
        this.jobEndTime = new Date();
        this.refreshIcon();
    }

    private jobCompleted() {
        this.jobStatus = JobStatus.SUCCESS;
        this.jobEndTime = new Date();
        if(this.onJobFinish) {this.onJobFinish();}
        this.refreshIcon();
    }

    private refreshIcon() {
        this.iconPath = this.getIcon();
        this.label = this.jobTime ? this.jobName + ' (' + this.jobTime + ')': this.jobName;
        refreshRunningTasks();
    }

    private get jobTime(): string | null{
        if(this.jobStartTime && this.jobEndTime) {
            let dif = this.jobEndTime.getTime() - this.jobStartTime.getTime();
            return Math.abs(dif/1000).toString();
        }
        else{
            return null;
        }
    }

    public addJob(job: Job) {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        this.subJobs.push(job);
    }

    private hasSubJobs(): boolean {
        return this.subJobs.length > 0;
    }

    private hasNextSubJob() {
        return this.currentSubJobIndex + 1 < this.subJobs.length && this.hasSubJobs();
    }

    private runNextSubJob() {
        this.currentSubJobIndex++;
        console.log('RUNNING SUBJOB: ' + this.currentSubJobIndex);
        return this.subJobs[this.currentSubJobIndex].startJob();
    }

    private setProgressState() {
        vscode.window.withProgress(
            {
                location: { viewId: 'runningTasks' },
                cancellable: true
            },
            async (progress) =>
            {
                await this.shellCommand?.shellPromise;
            });
    }

    constructor(jobName: string, shellCommand?: ShellCommand) {
        super(jobName, vscode.TreeItemCollapsibleState.None);
        this.jobName = jobName;
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
            case JobStatus.CANCELLED:
                return new vscode.ThemeIcon('circle-outline');
            default:
                return new vscode.ThemeIcon('testing-queued-icon');
        }
    }
}
// eslint-disable-next-line
export enum JobStatus {IN_PROGRESS, CANCELLED, ERROR, SUCCESS, SCHEDULED}
// eslint-disable-next-line
export abstract class EXTENSION_CONTEXT {
	public static  get isMultiPackageDirectory(): boolean { return IS_MULTI_PCKG_DIRECTORY();}
    public static get projJson(): string { return SFDX_PROJECT_JSON();}
    public static jobs: Job[] = [];
    private static runningTaskProvider: RunningTaskProvider;
    private static currentJobIndex = -1;
    private static processCancelled: boolean = false;

    public static hasNextJob(): boolean {
        return this.currentJobIndex + 1 < this.jobs.length && this.jobs.length > 0;
    }

    public static async startJobs() {
        //startJobs should not initiate processes multiple times
        if(!this.hasActiveJob()) {
            while(this.hasNextJob()) {
                if(this.processCancelled === true) {
                    return;
                }
                let job = this.getNextJob();
                try{
                    await job.startJob();
                }
                catch(exception) {
                    //If a job in the process chain rejects, we move to the next, unless cancel is sent
                    if(exception === 'Cancel') {
                        this.cancelJobs();
                    }
                }
            }
        }
    }

    public static hasActiveJob(): boolean {
        let activeJob = false;
        for (let index = 0; index < this.jobs.length; index++) {
            const job = this.jobs[index];
            activeJob = job.jobStatus === JobStatus.IN_PROGRESS;
            if(activeJob) { break; }
        }
        return activeJob;
    }

    public static cancelJobs() {
        if(this.hasActiveJob()) {
            console.log('CANCELLING ACTIVE JOBS');
            //When job is running the currentJobIndex is a step behind
            let indx = this.currentJobIndex;
            this.processCancelled = true;
            for (indx; indx < this.jobs.length; indx++) {
                const job = this.jobs[indx];
                job.cancel();
            }
        }
    }

    public static getNextJob(): Job {
        this.currentJobIndex++;
        return this.jobs[this.currentJobIndex];
    }

    public static setRunningTaskProvider(runningTaskProvider: RunningTaskProvider) {
        this.runningTaskProvider = runningTaskProvider;
    }

    public static refreshRunningTasks() {
        this.runningTaskProvider.refresh();
    }

    public static addJob(job: Job) {
        //If the previous process chain was cancelled, clear the jobs before submitting new ones
        if(this.processCancelled === true) { this.clearJobs(); }
        this.jobs.push(job);
        this.refreshRunningTasks();
        return this;
    }

    //Only allow clearing the jobs if no jobs are currently running
    public static clearJobs() {
        if(!this.hasActiveJob()) {
            this.jobs = [];
            this.currentJobIndex = -1; //Reset process index
            this.processCancelled = false; // Reset process flag
            this.refreshRunningTasks();
        }
        else{
            vscode.window.showErrorMessage(
                'You have running jobs in progress. cancel jobs?',
                ...['Yes', 'No']
            )
            .then(value => {
                if(value === 'Yes') {
                    this.cancelJobs();
                    this.clearJobs();
                }
            });
        }
    }
}