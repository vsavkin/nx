#!/usr/bin/env node

// we can't import from '@nrwl/workspace' because it will require typescript
import { output } from '@nrwl/workspace/src/utilities/output';
import { getPackageManagerCommand } from '@nrwl/tao/src/shared/package-manager';
import { dirSync } from 'tmp';
import { writeFileSync, readFileSync, removeSync } from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import * as inquirer from 'inquirer';
import yargsParser = require('yargs-parser');
import { showNxWarning } from './shared';

const tsVersion = 'TYPESCRIPT_VERSION';
const cliVersion = 'NX_VERSION';
const nxVersion = 'NX_VERSION';
const prettierVersion = 'PRETTIER_VERSION';

const parsedArgs = yargsParser(process.argv, {
  string: ['pluginName', 'packageManager'],
  alias: {
    pluginName: 'plugin-name',
  },
  boolean: ['help'],
});

function createSandbox(packageManager: string) {
  console.log(`Creating a sandbox with Nx...`);
  const tmpDir = dirSync().name;
  writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@nrwl/workspace': nxVersion,
        '@nrwl/tao': cliVersion,
        typescript: tsVersion,
        prettier: prettierVersion,
      },
      license: 'MIT',
    })
  );

  execSync(`${packageManager} install --silent`, {
    cwd: tmpDir,
    stdio: [0, 1, 2],
  });

  return tmpDir;
}

function createWorkspace(
  tmpDir: string,
  packageManager: string,
  parsedArgs: any,
  name: string
) {
  const args = [
    name,
    ...process.argv.slice(parsedArgs._[2] ? 3 : 2).map((a) => `"${a}"`),
  ].join(' ');

  const command = `new ${args} --preset=empty --collection=@nrwl/workspace`;
  console.log(command);

  const pmc = getPackageManagerCommand(packageManager);
  execSync(
    `${
      pmc.exec
    } tao ${command}/collection.json --nxWorkspaceRoot="${process.cwd()}"`,
    {
      stdio: [0, 1, 2],
      cwd: tmpDir,
    }
  );
  execSync(`${packageManager} add -D @nrwl/nx-plugin@${nxVersion}`, {
    cwd: name,
    stdio: [0, 1, 2],
  });
}

function createNxPlugin(workspaceName, pluginName, packageManager) {
  console.log(
    `nx generate @nrwl/nx-plugin:plugin ${pluginName} --importPath=${workspaceName}/${pluginName}`
  );
  const pmc = getPackageManagerCommand(packageManager);
  execSync(
    `${pmc.exec} nx generate @nrwl/nx-plugin:plugin ${pluginName} --importPath=${workspaceName}/${pluginName}`,
    {
      cwd: workspaceName,
      stdio: [0, 1, 2],
    }
  );
}

function updateWorkspace(workspaceName: string) {
  const nxJsonPath = path.join(workspaceName, 'nx.json');

  const nxJson = JSON.parse(readFileSync(nxJsonPath).toString('UTF-8'));

  nxJson['workspaceLayout'] = {
    appsDir: 'e2e',
    libsDir: 'packages',
  };

  writeFileSync(nxJsonPath, JSON.stringify(nxJson, undefined, 2));

  removeSync(path.join(workspaceName, 'apps'));
  removeSync(path.join(workspaceName, 'libs'));
}

function commitChanges(workspaceName) {
  execSync('git add .', {
    cwd: workspaceName,
    stdio: 'ignore',
  });
  execSync('git commit --amend --no-edit', {
    cwd: workspaceName,
    stdio: 'ignore',
  });
}

function determineWorkspaceName(parsedArgs: any): Promise<string> {
  const workspaceName: string = parsedArgs._[2];

  if (workspaceName) {
    return Promise.resolve(workspaceName);
  }

  return inquirer
    .prompt([
      {
        name: 'WorkspaceName',
        message: `Workspace name (e.g., org name)    `,
        type: 'string',
      },
    ])
    .then((a) => {
      if (!a.WorkspaceName) {
        output.error({
          title: 'Invalid workspace name',
          bodyLines: [`Workspace name cannot be empty`],
        });
        process.exit(1);
      }
      return a.WorkspaceName;
    });
}

function determinePluginName(parsedArgs) {
  if (parsedArgs.pluginName) {
    return Promise.resolve(parsedArgs.pluginName);
  }

  return inquirer
    .prompt([
      {
        name: 'PluginName',
        message: `Plugin name                        `,
        type: 'string',
      },
    ])
    .then((a) => {
      if (!a.PluginName) {
        output.error({
          title: 'Invalid name',
          bodyLines: [`Name cannot be empty`],
        });
        process.exit(1);
      }
      return a.PluginName;
    });
}

function showHelp() {
  console.log(`
  Usage:  <name> [options]

  Create a new Nx workspace

  Args: 

    name           workspace name (e.g., org name)

  Options:

    pluginName     the name of the plugin to be created  
`);
}

if (parsedArgs.help) {
  showHelp();
  process.exit(0);
}

const packageManager = parsedArgs.packageManager || 'npm';
determineWorkspaceName(parsedArgs).then((workspaceName) => {
  return determinePluginName(parsedArgs).then((pluginName) => {
    const tmpDir = createSandbox(packageManager);
    createWorkspace(tmpDir, packageManager, parsedArgs, workspaceName);
    updateWorkspace(workspaceName);
    createNxPlugin(workspaceName, pluginName, packageManager);
    commitChanges(workspaceName);
    showNxWarning(workspaceName);
  });
});
