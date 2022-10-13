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