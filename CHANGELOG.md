# Change Log

All notable changes to the "dxmate" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [Unreleased]
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

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