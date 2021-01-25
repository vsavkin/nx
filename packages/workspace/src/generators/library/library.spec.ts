import { readJson, Tree, updateJson } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { NxJson } from '../../core/shared-interfaces';

import { libraryGenerator } from './library';
import { Schema } from './schema.d';

describe('lib', () => {
  let tree: Tree;
  const defaultOptions: Omit<Schema, 'name'> = {
    skipTsConfig: false,
    unitTestRunner: 'jest',
    skipFormat: false,
    linter: 'eslint',
    simpleModuleName: false,
    testEnvironment: 'jsdom',
    js: false,
    pascalCaseFiles: false,
    strict: false,
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('not nested', () => {
    it('should update workspace.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
      });
      const workspaceJson = readJson(tree, '/workspace.json');

      expect(workspaceJson.projects['my-lib'].root).toEqual('libs/my-lib');
      expect(workspaceJson.projects['my-lib'].architect.build).toBeUndefined();
      expect(workspaceJson.projects['my-lib'].architect.lint).toEqual({
        builder: '@nrwl/linter:eslint',
        options: {
          lintFilePatterns: ['libs/my-lib/**/*.ts'],
        },
      });
    });

    it('should update nx.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        tags: 'one,two',
      });
      const nxJson = readJson<NxJson>(tree, '/nx.json');
      expect(nxJson.projects).toEqual({
        'my-lib': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should update root tsconfig.json', async () => {
      await libraryGenerator(tree, { ...defaultOptions, name: 'myLib' });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');
      expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
        'libs/my-lib/src/index.ts',
      ]);
    });

    it('should update root tsconfig.json (no existing path mappings)', async () => {
      updateJson(tree, 'tsconfig.base.json', (json) => {
        json.compilerOptions.paths = undefined;
        return json;
      });

      await libraryGenerator(tree, { ...defaultOptions, name: 'myLib' });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');
      expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
        'libs/my-lib/src/index.ts',
      ]);
    });

    it('should create a local tsconfig.json', async () => {
      await libraryGenerator(tree, { ...defaultOptions, name: 'myLib' });
      const tsconfigJson = readJson(tree, 'libs/my-lib/tsconfig.json');
      expect(tsconfigJson).toMatchInlineSnapshot(`
        Object {
          "extends": "../../tsconfig.base.json",
          "files": Array [],
          "include": Array [],
          "references": Array [
            Object {
              "path": "./tsconfig.lib.json",
            },
            Object {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);
    });

    it('should extend the local tsconfig.json with tsconfig.spec.json', async () => {
      await libraryGenerator(tree, { ...defaultOptions, name: 'myLib' });
      const tsconfigJson = readJson(tree, 'libs/my-lib/tsconfig.spec.json');
      expect(tsconfigJson.extends).toEqual('./tsconfig.json');
    });

    it('should extend the local tsconfig.json with tsconfig.lib.json', async () => {
      await libraryGenerator(tree, { ...defaultOptions, name: 'myLib' });
      const tsconfigJson = readJson(tree, 'libs/my-lib/tsconfig.lib.json');
      expect(tsconfigJson.extends).toEqual('./tsconfig.json');
    });

    it('should generate files', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
      });

      expect(tree.exists(`libs/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.read(`libs/my-lib/jest.config.js`).toString())
        .toMatchInlineSnapshot(`
        "module.exports = {
          displayName: 'my-lib',
          preset: '../../jest.preset.js',
          globals: {
            'ts-jest': {
              tsConfig: '<rootDir>/tsconfig.spec.json',
            }
          },
          transform: {
            '^.+\\\\\\\\.[tj]sx?$':  'ts-jest' 
          },
            moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
          coverageDirectory: '../../coverage/libs/my-lib'
        };
        "
      `);
      expect(tree.exists('libs/my-lib/src/index.ts')).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/lib/my-lib.ts')).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/lib/my-lib.spec.ts')).toBeTruthy();
      expect(tree.exists('libs/my-lib/README.md')).toBeTruthy();

      const ReadmeContent = tree.read('libs/my-lib/README.md').toString();
      expect(ReadmeContent).toContain('nx test my-lib');
    });

    it('should add project to the jest config', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
      });

      expect(tree.read('jest.config.js').toString()).toMatchInlineSnapshot(`
        "module.exports = {
        projects: [\\"<rootDir>/libs/my-lib\\"]
        };"
      `);
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib2',
      });

      expect(tree.read('jest.config.js').toString()).toMatchInlineSnapshot(`
        "module.exports = {
        projects: [\\"<rootDir>/libs/my-lib\\",\\"<rootDir>/libs/my-lib2\\"]
        };"
      `);
    });
  });

  describe('nested', () => {
    it('should update nx.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
        tags: 'one',
      });
      const nxJson = readJson<NxJson>(tree, '/nx.json');
      expect(nxJson.projects).toEqual({
        'my-dir-my-lib': {
          tags: ['one'],
        },
      });

      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib2',
        directory: 'myDir',
        tags: 'one,two',
        simpleModuleName: true,
      });
      const nxJson2 = readJson<NxJson>(tree, '/nx.json');
      expect(nxJson2.projects).toEqual({
        'my-dir-my-lib': {
          tags: ['one'],
        },
        'my-dir-my-lib2': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
      });
      expect(tree.exists(`libs/my-dir/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.exists('libs/my-dir/my-lib/src/index.ts')).toBeTruthy();
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/my-dir-my-lib.ts')
      ).toBeTruthy();
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/my-dir-my-lib.spec.ts')
      ).toBeTruthy();
      expect(tree.exists('libs/my-dir/my-lib/src/index.ts')).toBeTruthy();
      expect(tree.exists(`libs/my-dir/my-lib/.eslintrc.json`)).toBeTruthy();
    });

    it('should update workspace.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
      });
      const workspaceJson = readJson(tree, '/workspace.json');

      expect(workspaceJson.projects['my-dir-my-lib'].root).toEqual(
        'libs/my-dir/my-lib'
      );
      expect(workspaceJson.projects['my-dir-my-lib'].architect.lint).toEqual({
        builder: '@nrwl/linter:eslint',
        options: {
          lintFilePatterns: ['libs/my-dir/my-lib/**/*.ts'],
        },
      });
    });

    it('should update tsconfig.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
      });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');
      expect(
        tsconfigJson.compilerOptions.paths['@proj/my-dir/my-lib']
      ).toEqual(['libs/my-dir/my-lib/src/index.ts']);
      expect(
        tsconfigJson.compilerOptions.paths['my-dir-my-lib/*']
      ).toBeUndefined();
    });

    it('should create a local tsconfig.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
      });

      const tsconfigJson = readJson(tree, 'libs/my-dir/my-lib/tsconfig.json');
      expect(tsconfigJson.references).toEqual([
        {
          path: './tsconfig.lib.json',
        },
        {
          path: './tsconfig.spec.json',
        },
      ]);
    });

    it('should create a local .eslintrc.json', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
      });

      const lint = readJson(tree, 'libs/my-dir/my-lib/.eslintrc.json');
      expect(lint.extends).toEqual(['../../../.eslintrc.json']);
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration nor spec file', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        unitTestRunner: 'none',
      });

      expect(tree.exists('libs/my-lib/tsconfig.spec.json')).toBeFalsy();
      expect(tree.exists('libs/my-lib/jest.config.js')).toBeFalsy();
      expect(tree.exists('libs/my-lib/src/lib/my-lib.spec.ts')).toBeFalsy();

      const workspaceJson = readJson(tree, 'workspace.json');
      expect(workspaceJson.projects['my-lib'].architect.test).toBeUndefined();
      expect(workspaceJson.projects['my-lib'].architect.lint)
        .toMatchInlineSnapshot(`
        Object {
          "builder": "@nrwl/linter:eslint",
          "options": Object {
            "lintFilePatterns": Array [
              "libs/my-lib/**/*.ts",
            ],
          },
        }
      `);
    });
  });

  describe('--strict', () => {
    it('should update the projects tsconfig with strict true', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        strict: true,
      });
      const tsconfigJson = readJson(tree, '/libs/my-lib/tsconfig.lib.json');

      expect(tsconfigJson.compilerOptions.strict).toBeTruthy();
      expect(
        tsconfigJson.compilerOptions.forceConsistentCasingInFileNames
      ).toBeTruthy();
      expect(tsconfigJson.compilerOptions.noImplicitReturns).toBeTruthy();
      expect(
        tsconfigJson.compilerOptions.noFallthroughCasesInSwitch
      ).toBeTruthy();
    });

    it('should default to strict false', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
      });
      const tsconfigJson = readJson(tree, '/libs/my-lib/tsconfig.lib.json');

      expect(tsconfigJson.compilerOptions.strict).not.toBeDefined();
      expect(
        tsconfigJson.compilerOptions.forceConsistentCasingInFileNames
      ).not.toBeDefined();
      expect(tsconfigJson.compilerOptions.noImplicitReturns).not.toBeDefined();
      expect(
        tsconfigJson.compilerOptions.noFallthroughCasesInSwitch
      ).not.toBeDefined();
    });
  });

  describe('--importPath', () => {
    it('should update the tsconfig with the given import path', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
        importPath: '@myorg/lib',
      });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');

      expect(tsconfigJson.compilerOptions.paths['@myorg/lib']).toBeDefined();
    });

    it('should fail if the same importPath has already been used', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib1',
        importPath: '@myorg/lib',
      });

      try {
        await libraryGenerator(tree, {
          ...defaultOptions,
          name: 'myLib2',
          importPath: '@myorg/lib',
        });
      } catch (e) {
        expect(e.message).toContain(
          'You already have a library using the import path'
        );
      }

      expect.assertions(1);
    });
  });

  describe('--js flag', () => {
    it('should generate js files instead of ts files', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        js: true,
      });
      expect(tree.exists(`libs/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/index.js')).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/lib/my-lib.js')).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/lib/my-lib.spec.js')).toBeTruthy();
    });

    it('should update tsconfig.json with compilerOptions.allowJs: true', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        js: true,
      });
      expect(
        readJson(tree, 'libs/my-lib/tsconfig.json').compilerOptions
      ).toEqual({
        allowJs: true,
      });
    });

    it('should update tsconfig.lib.json include with **/*.js glob', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        js: true,
      });
      expect(readJson(tree, 'libs/my-lib/tsconfig.lib.json').include).toEqual([
        '**/*.ts',
        '**/*.js',
      ]);
    });

    it('should update root tsconfig.json with a js file path', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        js: true,
      });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');
      expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
        'libs/my-lib/src/index.js',
      ]);
    });

    it('should generate js files for nested libs as well', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
        js: true,
      });
      expect(tree.exists(`libs/my-dir/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.exists('libs/my-dir/my-lib/src/index.js')).toBeTruthy();
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/my-dir-my-lib.js')
      ).toBeTruthy();
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/my-dir-my-lib.spec.js')
      ).toBeTruthy();
      expect(tree.exists('libs/my-dir/my-lib/src/index.js')).toBeTruthy();
    });

    it('should configure the project for linting js files', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
        js: true,
      });
      expect(
        readJson(tree, 'workspace.json').projects['my-dir-my-lib'].architect
          .lint.options.lintFilePatterns
      ).toEqual(['libs/my-dir/my-lib/**/*.js']);
      expect(readJson(tree, 'libs/my-dir/my-lib/.eslintrc.json'))
        .toMatchInlineSnapshot(`
        Object {
          "extends": Array [
            "../../../.eslintrc.json",
          ],
          "ignorePatterns": Array [
            "!**/*",
          ],
          "rules": Object {},
        }
      `);
    });
  });

  describe(`--babelJest`, () => {
    it('should use babel for jest', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        babelJest: true,
      } as Schema);

      expect(tree.read(`libs/my-lib/jest.config.js`).toString())
        .toMatchInlineSnapshot(`
        "module.exports = {
          displayName: 'my-lib',
          preset: '../../jest.preset.js',
          transform: {
            '^.+\\\\\\\\.[tj]sx?$': [ 'babel-jest',
            { cwd: __dirname, configFile: './babel-jest.config.json' }]
          },
            moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
          coverageDirectory: '../../coverage/libs/my-lib'
        };
        "
      `);

      expect(readJson(tree, 'libs/my-lib/babel-jest.config.json'))
        .toMatchInlineSnapshot(`
        Object {
          "presets": Array [
            Array [
              "@babel/preset-env",
              Object {
                "targets": Object {
                  "node": "current",
                },
              },
            ],
            "@babel/preset-typescript",
            "@babel/preset-react",
          ],
        }
      `);
    });
  });
  describe('--pascalCaseFiles', () => {
    it('should generate files with upper case names', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        pascalCaseFiles: true,
      });
      expect(tree.exists('libs/my-lib/src/lib/MyLib.ts')).toBeTruthy();
      expect(tree.exists('libs/my-lib/src/lib/MyLib.spec.ts')).toBeTruthy();
    });

    it('should generate files with upper case names for nested libs as well', async () => {
      await libraryGenerator(tree, {
        ...defaultOptions,
        name: 'myLib',
        directory: 'myDir',
        pascalCaseFiles: true,
      });
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/MyDirMyLib.ts')
      ).toBeTruthy();
      expect(
        tree.exists('libs/my-dir/my-lib/src/lib/MyDirMyLib.spec.ts')
      ).toBeTruthy();
    });
  });
});
