# ACN einstein

ACN Einstein is an extension that provides a set of UI actions to improve SFDX development efficiency

## Features

Key features includes:
- Import dummy data to your scratch org
- Create new scratch org
- Assign default permission sets
- Deploy unpackagable metadata
- Push/pull source
- Open scratch org

In addition the create scratch org command automatically chains the following actions:
1. Creating scratch org with alias as input
2. Installing package dependencies
3. Pushing project source to scratch org
4. Deploy unpackagable
5. Open scratch org
6. Assigning default permission sets
7. Importing dummy data

## Requirements

This extension requires you to install the sfpowerkit plugin:
```bash
sfdx plugins:install sfpowerkit
```

## Extension Settings

This extension contributes the following settings:

* `dummy.data.location`: Set the workspace relative directory for the dummy data
* `unpackagable.location`: Set the workspace relative directory for unpackagable metadata
* `scratch.default.permissionsets`: Set the list of default permission sets to be assigned for the workspace

## Known Issues

None yet

## Release Notes

### 1.0.0

Initial release of ACN Einstein
