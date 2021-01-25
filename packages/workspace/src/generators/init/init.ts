import {
  addDependenciesToPackageJson,
  addProjectConfiguration,
  convertNxGenerator,
  formatFiles,
  generateFiles,
  getWorkspacePath,
  installPackagesTask,
  names,
  offsetFromRoot,
  readJson,
  readProjectConfiguration,
  readWorkspaceConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
  updateWorkspaceConfiguration,
  visitNotIgnoredFiles,
  writeJson,
} from '@nrwl/devkit';
import { basename, join, normalize } from 'path';
import { Schema } from './schema';
import {
  angularCliVersion,
  nxVersion,
  prettierVersion,
} from '../../utils/versions';
import { DEFAULT_NRWL_PRETTIER_CONFIG } from '../workspace/workspace';
import { readFileSync } from 'fs';
import { serializeJson } from '../../utilities/fileutils';
import { resolveUserExistingPrettierConfig } from '../../utilities/prettier';

function updatePackageJson(tree) {
  updateJson(tree, 'package.json', (packageJson) => {
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts = {
      ...packageJson.scripts,
      nx: 'nx',
      'affected:apps': 'nx affected:apps',
      'affected:libs': 'nx affected:libs',
      'affected:build': 'nx affected:build',
      'affected:e2e': 'nx affected:e2e',
      'affected:test': 'nx affected:test',
      'affected:lint': 'nx affected:lint',
      'affected:dep-graph': 'nx affected:dep-graph',
      affected: 'nx affected',
      format: 'nx format:write',
      'format:write': 'nx format:write',
      'format:check': 'nx format:check',
      update: 'ng update @nrwl/workspace',
      'update:check': 'ng update',
      lint: 'nx workspace-lint && ng lint',
      'dep-graph': 'nx dep-graph',
      'workspace-schematic': 'nx workspace-schematic',
      help: 'nx help',
    };
    packageJson.devDependencies = packageJson.devDependencies || {};
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.dependencies['@nrwl/angular']) {
      packageJson.dependencies['@nrwl/angular'] = nxVersion;
    }
    if (!packageJson.devDependencies['@nrwl/workspace']) {
      packageJson.devDependencies['@nrwl/workspace'] = nxVersion;
    }
    if (!packageJson.devDependencies['@angular/cli']) {
      packageJson.devDependencies['@angular/cli'] = angularCliVersion;
    }
    if (!packageJson.devDependencies['prettier']) {
      packageJson.devDependencies['prettier'] = prettierVersion;
    }

    return packageJson;
  });
}

function getRootTsConfigPath(host: Tree) {
  return host.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
}

function convertPath(name: string, originalPath: string) {
  return `apps/${name}/${originalPath}`;
}

function updateAngularCLIJson(host: Tree, options: Schema) {
  const workspaceConfig = readWorkspaceConfiguration(host);
  const appName = workspaceConfig.defaultProject;
  const e2eName = appName + '-e2e';
  const e2eRoot = join('apps', e2eName);
  delete (workspaceConfig as any).newProjectRoot;

  const defaultProject = readProjectConfiguration(host, appName);

  const oldSourceRoot = defaultProject.sourceRoot;
  const newRoot = join('apps', appName);
  defaultProject.root = newRoot;
  defaultProject.sourceRoot = join(newRoot, 'src');

  function convertBuildOptions(buildOptions) {
    buildOptions.outputPath =
      buildOptions.outputPath && join(normalize('dist'), 'apps', appName);
    buildOptions.index =
      buildOptions.index && convertAsset(buildOptions.index as string);
    buildOptions.main =
      buildOptions.main && convertAsset(buildOptions.main as string);
    buildOptions.polyfills =
      buildOptions.polyfills && convertAsset(buildOptions.polyfills as string);
    buildOptions.tsConfig =
      buildOptions.tsConfig && join(newRoot, 'tsconfig.app.json');
    buildOptions.assets =
      buildOptions.assets && (buildOptions.assets as any).map(convertAsset);
    buildOptions.styles =
      buildOptions.styles && (buildOptions.styles as any).map(convertAsset);
    buildOptions.scripts =
      buildOptions.scripts && (buildOptions.scripts as any).map(convertAsset);
    buildOptions.fileReplacements =
      buildOptions.fileReplacements &&
      buildOptions.fileReplacements.map((replacement) => ({
        replace: convertAsset(replacement.replace),
        with: convertAsset(replacement.with),
      }));
  }
  convertBuildOptions(defaultProject.targets.build.options);
  Object.values(defaultProject.targets.build.configurations).forEach((config) =>
    convertBuildOptions(config)
  );

  if (defaultProject.targets.test) {
    const testOptions = defaultProject.targets.test.options;
    testOptions.main = testOptions.main && convertAsset(testOptions.main);
    testOptions.polyfills =
      testOptions.polyfills && convertAsset(testOptions.polyfills);
    testOptions.tsConfig = join(newRoot, 'tsconfig.spec.json');
    testOptions.karmaConfig = join(newRoot, 'karma.conf.js');
    testOptions.assets =
      testOptions.assets && (testOptions.assets as any).map(convertAsset);
    testOptions.styles =
      testOptions.styles && (testOptions.styles as any).map(convertAsset);
    testOptions.scripts =
      testOptions.scripts && (testOptions.scripts as any).map(convertAsset);
  }

  const lintTarget = defaultProject.targets.lint;

  if (lintTarget) {
    lintTarget.options.tsConfig = [
      join(newRoot, 'tsconfig.app.json'),
      join(newRoot, 'tsconfig.spec.json'),
    ];
  }

  function convertServerOptions(serverOptions) {
    serverOptions.outputPath =
      serverOptions.outputPath &&
      join(normalize('dist'), 'apps', options.name + '-server');
    serverOptions.main = serverOptions.main && convertAsset(serverOptions.main);
    serverOptions.tsConfig =
      serverOptions.tsConfig &&
      join(normalize('apps'), appName, 'tsconfig.server.json');
    serverOptions.fileReplacements =
      serverOptions.fileReplacements &&
      serverOptions.fileReplacements.map((replacement) => ({
        replace: convertAsset(replacement.replace),
        with: convertAsset(replacement.with),
      }));
  }

  if (defaultProject.targets.server) {
    const serverOptions = defaultProject.targets.server.options;
    convertServerOptions(serverOptions);
    Object.values(
      defaultProject.targets.server.configurations
    ).forEach((config) => convertServerOptions(config));
  }

  if (defaultProject.targets.e2e) {
    const lintTargetOptions = lintTarget ? lintTarget.options : {};
    addProjectConfiguration(host, e2eName, {
      root: e2eRoot,
      projectType: 'application',
      targets: {
        e2e: {
          ...defaultProject.targets.e2e,
          options: {
            ...defaultProject.targets.e2e.options,
            protractorConfig: join(e2eRoot, 'protractor.conf.js'),
          },
        },
        lint: {
          executor: '@angular-devkit/build-angular:tslint',
          options: {
            ...lintTargetOptions,
            tsConfig: join(e2eRoot, 'tsconfig.json'),
          },
        },
      },
      implicitDependencies: [appName],
      tags: [],
    });
  }

  updateProjectConfiguration(host, appName, defaultProject);

  workspaceConfig.cli = workspaceConfig.cli || ({} as any);
  if (!workspaceConfig.cli.defaultCollection) {
    workspaceConfig.cli.defaultCollection = '@nrwl/angular';
  }
  updateWorkspaceConfiguration(host, workspaceConfig);

  function convertAsset(asset: string | any) {
    if (typeof asset === 'string') {
      return asset.startsWith(oldSourceRoot)
        ? convertPath(appName, asset.replace(oldSourceRoot, 'src'))
        : asset;
    } else {
      return {
        ...asset,
        input:
          asset.input && asset.input.startsWith(oldSourceRoot)
            ? convertPath(appName, asset.input.replace(oldSourceRoot, 'src'))
            : asset.input,
      };
    }
  }
}

function updateTsConfig(host: Tree) {
  updateJson(host, 'nx.json', (json) => {
    json.implicitDependencies['tsconfig.base.json'] = '*';
    return json;
  });
  writeJson(
    host,
    'tsconfig.base.json',
    setUpCompilerOptions(readJson(host, getRootTsConfigPath(host)))
  );
  if (host.exists('tsconfig.json')) {
    host.delete('tsconfig.json');
  }
}

function updateTsConfigsJson(host: Tree, options: Schema) {
  const workspaceJson = readJson(host, 'angular.json');
  const app = workspaceJson.projects[options.name];
  const e2eProject = getE2eProject(workspaceJson);
  const tsConfigPath = getRootTsConfigPath(host);
  const appOffset = offsetFromRoot(app.root);

  updateJson(host, app.targets.build.options.tsConfig, (json) => {
    json.extends = `${appOffset}${tsConfigPath}`;
    json.compilerOptions = json.compilerOptions || {};
    json.compilerOptions.outDir = `${appOffset}dist/out-tsc`;
    return json;
  });

  if (app.targets.test) {
    updateJson(host, app.targets.test.options.tsConfig, (json) => {
      json.extends = `${appOffset}${tsConfigPath}`;
      json.compilerOptions = json.compilerOptions || {};
      json.compilerOptions.outDir = `${appOffset}dist/out-tsc`;
      return json;
    });
  }

  if (app.targets.server) {
    updateJson(host, app.targets.server.options.tsConfig, (json) => {
      json.extends = `${appOffset}${tsConfigPath}`;
      json.compilerOptions = json.compilerOptions || {};
      json.compilerOptions.outDir = `${appOffset}dist/out-tsc`;
      return json;
    });
  }

  if (!!e2eProject) {
    updateJson(host, e2eProject.targets.lint.options.tsConfig, (json) => {
      json.extends = `${offsetFromRoot(e2eProject.root)}${tsConfigPath}`;
      json.compilerOptions = {
        ...json.compilerOptions,
        outDir: `${offsetFromRoot(e2eProject.root)}dist/out-tsc`,
      };
      return json;
    });
  }
}

function updateTsLint(host: Tree) {
  updateJson(host, 'tslint.json', (tslintJson) => {
    [
      'no-trailing-whitespace',
      'one-line',
      'quotemark',
      'typedef-whitespace',
      'whitespace',
    ].forEach((key) => {
      tslintJson[key] = undefined;
    });
    tslintJson.rulesDirectory = tslintJson.rulesDirectory || [];
    tslintJson.rulesDirectory.push('node_modules/@nrwl/workspace/src/tslint');
    tslintJson.rules['nx-enforce-module-boundaries'] = [
      true,
      {
        allow: [],
        depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
      },
    ];
    return tslintJson;
  });
}

function updateProjectTsLint(host: Tree, options: Schema) {
  const workspaceJson = readJson(host, getWorkspacePath(host));
  const app = workspaceJson.projects[options.name];
  const offset = '../../';

  if (host.exists(`${app.root}/tslint.json`)) {
    updateJson(host, `${app.root}/tslint.json`, (json) => {
      json.extends = `${offset}tslint.json`;
      return json;
    });
  }
}

function setUpCompilerOptions(tsconfig: any): any {
  if (!tsconfig.compilerOptions.paths) {
    tsconfig.compilerOptions.paths = {};
  }
  tsconfig.compilerOptions.baseUrl = '.';
  tsconfig.compilerOptions.rootDir = '.';

  return tsconfig;
}

function moveOutOfSrc(
  tree: Tree,
  appName: string,
  filePath: string,
  required = true
) {
  if (!filePath) {
    return;
  }
  const filename = !!filePath ? basename(filePath) : '';
  const from = filePath;
  const to = filename ? join('apps', appName, filename) : join('apps', appName);
  renameSyncInTree(tree, from, to, required);
}

function getE2eKey(workspaceJson: any) {
  return Object.keys(workspaceJson.projects).find((key) => {
    return !!workspaceJson.projects[key]?.architect?.e2e;
  });
}

function getE2eProject(workspaceJson: any) {
  const key = getE2eKey(workspaceJson);
  if (key) {
    return workspaceJson.projects[key];
  } else {
    return null;
  }
}

function moveExistingFiles(host: Tree, options: Schema) {
  const workspaceJson = readJson(host, getWorkspacePath(host));
  const app = workspaceJson.projects[options.name];
  const e2eApp = getE2eProject(workspaceJson);

  // it is not required to have a browserslist
  moveOutOfSrc(host, options.name, 'browserslist', false);
  moveOutOfSrc(host, options.name, '.browserslistrc', false);
  moveOutOfSrc(host, options.name, app.architect.build.options.tsConfig);

  if (app.architect.test) {
    moveOutOfSrc(host, options.name, app.architect.test.options.karmaConfig);
    moveOutOfSrc(host, options.name, app.architect.test.options.tsConfig);
  } else {
    // there could still be a karma.conf.js file in the root
    // so move to new location
    if (host.exists('karma.conf.js')) {
      console.info('No test configuration, but root Karma config file found');

      moveOutOfSrc(host, options.name, 'karma.conf.js');
    }
  }

  if (app.architect.server) {
    moveOutOfSrc(host, options.name, app.architect.server.options.tsConfig);
  }
  const oldAppSourceRoot = app.sourceRoot;
  const newAppSourceRoot = join('apps', options.name, 'src');
  renameDirSyncInTree(host, oldAppSourceRoot, newAppSourceRoot);
  if (e2eApp) {
    const oldE2eRoot = join(app.root || '', 'e2e');
    const newE2eRoot = join('apps', getE2eKey(workspaceJson) + '-e2e');
    renameDirSyncInTree(host, oldE2eRoot, newE2eRoot);
  } else {
    console.warn(
      'No e2e project was migrated because there was none declared in angular.json'
    );
  }

  return host;
}

async function createAdditionalFiles(host: Tree, options: Schema) {
  const workspaceJson = readJson(host, 'angular.json');
  host.write(
    'nx.json',
    serializeJson({
      npmScope: options.npmScope,
      affected: {
        defaultBase: `${options.defaultBase}` || 'master',
      },
      implicitDependencies: {
        'angular.json': '*',
        'package.json': '*',
        'tslint.json': '*',
        '.eslintrc.json': '*',
        'nx.json': '*',
      },
      projects: {
        [options.name]: {
          tags: [],
        },
        [getE2eKey(workspaceJson) + '-e2e']: {
          tags: [],
        },
      },
    })
  );
  host.write('libs/.gitkeep', '');

  const recommendations = [
    'nrwl.angular-console',
    'angular.ng-template',
    'ms-vscode.vscode-typescript-tslint-plugin',
    'esbenp.prettier-vscode',
  ];
  if (host.exists('.vscode/extensions.json')) {
    updateJson(
      host,
      '.vscode/extensions.json',
      (json: { recommendations?: string[] }) => {
        json.recommendations = json.recommendations || [];
        recommendations.forEach((extension) => {
          if (!json.recommendations.includes(extension)) {
            json.recommendations.push(extension);
          }
        });

        return json;
      }
    );
  } else {
    writeJson(host, '.vscode/extensions.json', {
      recommendations,
    });
  }

  // if the user does not already have a prettier configuration
  // of any kind, create one
  const existingPrettierConfig = await resolveUserExistingPrettierConfig();
  if (!existingPrettierConfig) {
    host.write('.prettierrc', serializeJson(DEFAULT_NRWL_PRETTIER_CONFIG));
  }
}

function checkCanConvertToWorkspace(host: Tree) {
  try {
    if (!host.exists('package.json')) {
      throw new Error('Cannot find package.json');
    }

    if (!host.exists('angular.json')) {
      throw new Error('Cannot find angular.json');
    }

    // TODO: This restriction should be lited
    const workspaceJson = readJson(host, 'angular.json');
    const hasLibraries = Object.keys(workspaceJson.projects).find(
      (project) =>
        workspaceJson.projects[project].projectType &&
        workspaceJson.projects[project].projectType !== 'application'
    );

    if (Object.keys(workspaceJson.projects).length > 2 || hasLibraries) {
      throw new Error('Can only convert projects with one app');
    }
    const e2eKey = getE2eKey(workspaceJson);
    const e2eApp = getE2eProject(workspaceJson);
    if (e2eApp && !host.exists(e2eApp.architect.e2e.options.protractorConfig)) {
      console.info(
        `Make sure the ${e2eKey}.architect.e2e.options.protractorConfig is valid or the ${e2eKey} project is removed from angular.json.`
      );
      throw new Error(
        `An e2e project was specified but ${e2eApp.architect.e2e.options.protractorConfig} could not be found.`
      );
    }

    return host;
  } catch (e) {
    console.error(e.message);
    console.error(
      'Your workspace could not be converted into an Nx Workspace because of the above error.'
    );
    throw e;
  }
}

function createNxJson(host: Tree) {
  const json = JSON.parse(host.read('angular.json').toString());
  const projects = json.projects || {};
  const hasLibraries = Object.keys(projects).find(
    (project) =>
      projects[project].projectType &&
      projects[project].projectType !== 'application'
  );

  if (Object.keys(projects).length !== 1 || hasLibraries) {
    throw new Error(
      `The schematic can only be used with Angular CLI workspaces with a single application.`
    );
  }
  const name = Object.keys(projects)[0];
  const tsConfigPath = getRootTsConfigPath(host);
  host.write(
    'nx.json',
    serializeJson({
      npmScope: name,
      implicitDependencies: {
        'angular.json': '*',
        'package.json': '*',
        [tsConfigPath]: '*',
        'tslint.json': '*',
        '.eslintrc.json': '*',
        'nx.json': '*',
      },
      projects: {
        [name]: {
          tags: [],
        },
      },
      tasksRunnerOptions: {
        default: {
          runner: '@nrwl/workspace/tasks-runners/default',
          options: {
            cacheableOperations: ['build', 'lint', 'test', 'e2e'],
          },
        },
      },
    })
  );
}

function decorateAngularClI(host: Tree) {
  const decorateCli = readFileSync(
    join(__dirname as any, '..', 'utils', 'decorate-angular-cli.js__tmpl__')
  ).toString();
  host.write('decorate-angular-cli.js', decorateCli);
  updateJson(host, 'package.json', (json) => {
    if (
      json.scripts &&
      json.scripts.postinstall &&
      !json.scripts.postinstall.includes('decorate-angular-cli.js')
    ) {
      // if exists, add execution of this script
      json.scripts.postinstall += ' && node ./decorate-angular-cli.js';
    } else {
      if (!json.scripts) json.scripts = {};
      // if doesn't exist, set to execute this script
      json.scripts.postinstall = 'node ./decorate-angular-cli.js';
    }
    if (json.scripts.ng) {
      json.scripts.ng = 'nx';
    }
    return json;
  });
}

function addFiles(host: Tree) {
  generateFiles(host, join(__dirname, './files/root'), '.', {
    tmpl: '',
  });

  if (!host.exists('.prettierignore')) {
    generateFiles(host, join(__dirname, './files/prettier'), '.', {
      tmpl: '',
    });
  }
}

function renameSyncInTree(
  tree: Tree,
  from: string,
  to: string,
  required: boolean
) {
  if (!tree.exists(from)) {
    if (required) {
      console.warn(`Path: ${from} does not exist`);
    }
  } else if (tree.exists(to)) {
    if (required) {
      console.warn(`Path: ${to} already exists`);
    }
  } else {
    const contents = tree.read(from);
    tree.write(to, contents);
    tree.delete(from);
  }
}

function renameDirSyncInTree(tree: Tree, from: string, to: string) {
  visitNotIgnoredFiles(tree, from, (file) => {
    try {
      tree.rename(file, file.replace(from, to));
    } catch (e) {
      if (!tree.exists(from)) {
        console.warn(`Path: ${from} does not exist`);
      } else if (tree.exists(to)) {
        console.warn(`Path: ${to} already exists`);
      }
    }
  });
}

export async function initGenerator(tree: Tree, schema: Schema) {
  if (schema.preserveAngularCLILayout) {
    addDependenciesToPackageJson(tree, {}, { '@nrwl/workspace': nxVersion });
    createNxJson(tree);
    decorateAngularClI(tree);
    return;
  } else {
    const options = {
      ...schema,
      npmScope: names(schema.npmScope || schema.name).fileName,
    };

    checkCanConvertToWorkspace(tree);
    moveExistingFiles(tree, options);
    addFiles(tree);
    await createAdditionalFiles(tree, options);
    updatePackageJson(tree);
    updateAngularCLIJson(tree, options);
    updateTsLint(tree);
    updateProjectTsLint(tree, options);
    updateTsConfig(tree);
    updateTsConfigsJson(tree, options);
    decorateAngularClI(tree);
    await formatFiles(tree);
    if (!options.skipInstall) {
      return () => {
        installPackagesTask(tree);
      };
    }
  }
}

export const initSchematic = convertNxGenerator(initGenerator);

export default initGenerator;
