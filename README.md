# DX-Mate

DX-Mate is an extension that provides a set of UI actions to improve SFDX development efficiency. Note, when installing a new version using [vsix](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix) the previous version should be uninstalled first.

![Extension Screenshot](src/graphics/extension_screenshot.png)

## Features

Key features includes:
- Fetch scratch org from a pool
- Import dummy data to your scratch org
- Export data from a .soql file
- Create new scratch org
- Assign default permission sets
- Deploy unpackagable metadata
- Push/pull source
- Open scratch org

In addition the create scratch org command automatically chains the following actions:
1. Creating scratch org with alias as input
2. Installing package dependencies
3. Pushing project source to scratch org
4. Deploy unpackagable (For i.e. metadata that do not support packaging or should not be included in the package being developed)
5. Open scratch org
6. Assigning default permission sets
7. Importing dummy data

## Requirements

1. [Salesforce CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm)

2. sfpowerkit plugin
```bash
sfdx plugins:install sfpowerkit
```

Scratch org pooling is supported using DX-Mate and adheres to functionality from the [DX@Scale](https://docs.dxatscale.io/) framework. To activates these function your DebHub needs to have the unlocked package installed as described [here](https://docs.dxatscale.io/challenges/challenges/scratch-org-pooling). Also, two additional cli plugins must be installed:
```bash
sfdx plugins:install @dxatscale/sfpowerscripts 
````
```bash
sfdx plugins:install sfdmu  
```

## Extension Settings

This extension contributes the following settings:

* `dependency.keys`: Installation keys for all known dependencies only available in user settings
* `dummy.user.location`: Set the workspace relative directory for dummy users to create in scratch orgs
* `dummy.data.location`: Set the workspace relative directory for the dummy data
* `unpackagable.location`: Set the workspace relative directory for unpackagable metadata
* `scratch.default.permissionsets`: Set the list of default permission sets to be assigned for the workspace
* `multi.scratch.default.permissionsets`: Set the list of default permission sets per package directory for the workspace

## Known Issues

None yet
