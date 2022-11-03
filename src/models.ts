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
// eslint-disable-next-line
export abstract class EXTENSION_CONTEXT {
	public static  get isMultiPackageDirectory(): boolean { return IS_MULTI_PCKG_DIRECTORY();}
    public static get projJson(): string { return SFDX_PROJECT_JSON();}
}