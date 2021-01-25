import {
  Tree,
  convertNxGenerator,
  names,
  offsetFromRoot,
  generateFiles,
  toJS,
  getWorkspaceLayout,
  addProjectConfiguration,
  formatFiles,
  updateJson,
  GeneratorCallback,
} from '@nrwl/devkit';
import { join } from 'path';
import { Schema } from './schema';

const { jestProjectGenerator } = require('@nrwl/jest');
const { lintProjectGenerator, Linter } = require('@nrwl/linter');

export interface NormalizedSchema extends Schema {
  name: string;
  fileName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  importPath?: string;
}

function addProject(tree: Tree, options: NormalizedSchema) {
  addProjectConfiguration(tree, options.name, {
    root: options.projectRoot,
    sourceRoot: join(options.projectRoot, 'src'),
    projectType: 'library',
    targets: {},
    tags: options.parsedTags,
  });
}

function addLint(tree: Tree, options: NormalizedSchema) {
  return lintProjectGenerator(tree, {
    project: options.name,
    linter: options.linter,
    skipFormat: true,
    eslintFilePatterns: [
      `${options.projectRoot}/**/*.${options.js ? 'js' : 'ts'}`,
    ],
  });
}

function updateLibTsConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(tree, join(options.projectRoot, 'tsconfig.lib.json'), (json) => {
    if (options.strict) {
      json.compilerOptions = {
        ...json.compilerOptions,
        forceConsistentCasingInFileNames: true,
        strict: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
      };
    }

    return json;
  });
}

function updateRootTsConfig(host: Tree, options: NormalizedSchema) {
  updateJson(host, 'tsconfig.base.json', (json) => {
    const c = json.compilerOptions;
    c.paths = c.paths || {};
    delete c.paths[options.name];

    if (c.paths[options.importPath]) {
      throw new Error(
        `You already have a library using the import path "${options.importPath}". Make sure to specify a unique one.`
      );
    }

    c.paths[options.importPath] = [
      join(options.projectRoot, './src', 'index.' + (options.js ? 'js' : 'ts')),
    ];

    return json;
  });
}

function createFiles(tree: Tree, options: NormalizedSchema) {
  const { className, name, propertyName } = names(options.name);

  generateFiles(tree, join(__dirname, './files/lib'), options.projectRoot, {
    ...options,
    className,
    name,
    propertyName,
    js: !!options.js,
    cliCommand: 'nx',
    strict: undefined,
    tmpl: '',
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    hasUnitTestRunner: options.unitTestRunner !== 'none',
  });

  if (options.unitTestRunner === 'none') {
    tree.delete(
      join(options.projectRoot, 'src/lib', `${options.fileName}.spec.ts`)
    );
  }

  if (options.js) {
    toJS(tree);
  }

  updateLibTsConfig(tree, options);
}

async function addJest(tree: Tree, options: NormalizedSchema) {
  return await jestProjectGenerator(tree, {
    project: options.name,
    setupFile: 'none',
    supportTsx: true,
    babelJest: options.babelJest,
    skipSerializers: true,
    testEnvironment: options.testEnvironment,
    skipFormat: true,
  });
}

export async function libraryGenerator(tree: Tree, schema: Schema) {
  const options = normalizeOptions(tree, schema);

  createFiles(tree, options);

  if (!options.skipTsConfig) {
    updateRootTsConfig(tree, options);
  }
  addProject(tree, options);

  let installTask: GeneratorCallback;

  if (options.linter !== 'none') {
    installTask = await addLint(tree, options);
  }
  if (options.unitTestRunner === 'jest') {
    installTask = (await addJest(tree, options)) || installTask;
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return installTask;
}

export default libraryGenerator;
export const librarySchematic = convertNxGenerator(libraryGenerator);

function normalizeOptions(tree: Tree, options: Schema): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  if (!options.unitTestRunner) {
    options.unitTestRunner = 'jest';
  }

  if (!options.linter) {
    options.linter = Linter.EsLint;
  }

  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const fileName = getCaseAwareFileName({
    fileName: options.simpleModuleName ? name : projectName,
    pascalCaseFiles: options.pascalCaseFiles,
  });

  const { libsDir, npmScope } = getWorkspaceLayout(tree);

  const projectRoot = `${libsDir}/${projectDirectory}`;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const defaultImportPath = `@${npmScope}/${projectDirectory}`;
  const importPath = options.importPath || defaultImportPath;

  return {
    ...options,
    fileName,
    name: projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    importPath,
  };
}

function getCaseAwareFileName(options: {
  pascalCaseFiles: boolean;
  fileName: string;
}) {
  const normalized = names(options.fileName);

  return options.pascalCaseFiles ? normalized.className : normalized.fileName;
}
