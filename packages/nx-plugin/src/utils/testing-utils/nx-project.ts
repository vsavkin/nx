import { appRootPath } from '@nrwl/workspace/src/utilities/app-root';
import { getPackageManagerCommand } from '@nrwl/tao/src/shared/package-manager';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { ensureDirSync } from 'fs-extra';
import { tmpProjPath } from './paths';
import { cleanup } from './utils';

function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = dirname(tmpProjPath());
  return execSync(
    `node ${require.resolve(
      '@nrwl/tao'
    )} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nrwl/workspace --npmScope=proj --preset=empty ${
      args || ''
    }`,
    {
      cwd: localTmpDir,
      ...(silent && false ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    }
  );
}

export function patchPackageJsonForPlugin(
  npmPackageName: string,
  distPath: string
) {
  const p = JSON.parse(readFileSync(tmpProjPath('package.json')).toString());
  p.devDependencies[npmPackageName] = `file:${appRootPath}/${distPath}`;
  writeFileSync(tmpProjPath('package.json'), JSON.stringify(p, null, 2));
}

/**
 * Generate a unique name for running CLI commands
 * @param prefix
 *
 * @returns `'<prefix><random number>'`
 */
export function uniq(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 10000000)}`;
}

/**
 * Run the appropriate package manager install command in the e2e directory
 * @param silent silent output from the install
 */
export function runPackageManagerInstall(silent: boolean = true) {
  const pmc = getPackageManagerCommand();
  const install = execSync(pmc.install, {
    cwd: tmpProjPath(),
    ...(silent ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
  });
  return install ? install.toString() : '';
}

/**
 * Creates a new nx project in the e2e directory
 *
 * @param npmPackageName package name to test
 * @param pluginDistPath dist path where the plugin was outputted to
 */
export function newNxProject(
  npmPackageName: string,
  pluginDistPath: string
): void {
  cleanup();
  runNxNewCommand('', true);
  patchPackageJsonForPlugin(npmPackageName, pluginDistPath);
  runPackageManagerInstall();
}

/**
 * Ensures that a project has been setup in the e2e directory
 * It will also copy `@nrwl` packages to the e2e directory
 */
export function ensureNxProject(
  npmPackageName?: string,
  pluginDistPath?: string
): void {
  ensureDirSync(tmpProjPath());
  newNxProject(npmPackageName, pluginDistPath);
}
