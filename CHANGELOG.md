# Change Log

All notable changes to the "dxmate" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [2.0.6] - 
## Added
- Added support for scratch duration as input on scratch org creation
- Added support for dummy data import using SFDMU

## [2.0.5] - 2023-03-03
## Added
- Added support for scratch duration as input on scratch org creation
- Added support for dummy data import using SFDMU

## [2.0.4] - 2023-01-31
### Fixed
- Fixed issue where scratch org pooling was not activated for newer DX@Scale package versions

## Added
- Added setting scratch org fetched from pool as default org
- Chained push and default permset assign to pool fetch job chain

## [2.0.3] - 2023-01-21
### Changed
- Changed default permission set assignment to be project dependenct instead of package dependent to better fit DX@Scale
- Simplified workstream for scratch org create as sfpowerkit installs all deps by default. Package input is no longer required for mono-repo projects.

## [2.0.2] - 
### Added
- Added new explorer action to generate table markdown of salesforce fields. Useful when generating data model documentation in markdown files.

### Changed
- Added support for blank keys for dependencies and handling properly using sfpowerkit

### Fixed
- Improved error handling for mono repo projects with noe default permset config
- Improved error handling for mono repo projects with non package directories

## [2.0.1] - 2022-12-12
### Added
- Added job callback for more functionality in job chaining

### Fixed
- Improved error handling on pooling check and only run check in workspace with sfdx-project
- Bugfix for process cancelling

### Changed
- Scratch org creation will now delete existing scratch with matching alias prior to creation

## [2.0.0] - 2022-12-01
### Added
- DX-Mate now supports fetching scratch orgs from a scratch org pool. Your DevHub needs to adhere to the [DX@Scale](https://docs.dxatscale.io/) framework and have the unlocked package installed to support pooling.
- Added new action to allow creation of scratch org users. New workspace setting defines the directory to store valid user definiton files for using [sfdx force:user:create](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_force_user.htm#cli_reference_force_user_create)
- Upon activating the extension checks if the configured devhub has the scratch org pooling unlocked package installed, required for enabling pooling functionality

### Changed
- Creating login url is now also tracked in the running tasks list

### Fixed
- Fixed bug when cancelling failing job in a chain. This will now cancel the job and continue the chain.
- Fixed issue with improper use of relative urls for some of the extension settings.

## [1.0.12] - 2022-11-24
### Added
- Added sfdx export command to allow exporting data from the default org

### Changed
- Changed handling of dependency keys. Now stored as key -> value paris in extension user settings

### Fixed
- Fixed bug when cancelling a process, leaving the cancel flag set to true giving rise to unexpected errors

### Deprecated
- Removed use of the dxmate_config folder. New version will upon activation allows user to convert to new model

## [1.0.11] - 2022-11-17
### Fixed
- Fixed issue with calling dummy data import in an unchained job

## [1.0.10] - 2022-11-17
### Added
- Added the extension job tracker! Now the running processes are reflected in the tracker and also support for cancelling running process chaing and clearing the job history

### Changed
- Changed retry handling and job chaininng structure

### Fixed
- Improved fault handling when referencing folder/files that does not exist in directory for dummy data location and unpackagable location
- Fixed error when assigning default permsets for single package directory projects

## [1.0.9] - 2022-11-09
### Fixed
- Fixed issue where cli commands would not run on windows due to wrong usage of uri.path

### Changed
- Changed assign default permsets to support multi package directories

## [1.0.8] - 2022-11-04
### Added
- Added new extension setting to support default permset definitions for multi package directories

### Fixed
- Fixed issue where some actions did not exit correctly when escaping input boxes

### Changed
- Changed create scratch org command to support multi package directories
- Changed update/add dependency key command to support multi package directories
- Changed Add package dependency command to support multi package directories
- Changed dependency validation to support multi package directories


## [1.0.7] - 2022-10-13
### Added
- Added extension icon to the manifest
- Added sfdx create project action when vscode workspace does not contain a sfdx-project.json file.
- Added visibility conditions to extension for hiding while activating

### Changed
- Changed add dependency key action to also allow updating keys for existing dependencies
- Updated utils allowing execShell to suppress console output
- Changed generate login link command to prevent link creation for DevHub

### Removed
- Removed change default org action as Salesforce extension pack includes a good inbuilt alternative