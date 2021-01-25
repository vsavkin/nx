import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { readFileSync } from 'fs';
import { join } from 'path';

import { Schema } from '../schema';
import { updateJestConfig } from './update-jest-config';
import { libraryGenerator } from '../../library/library';

describe('updateRootJestConfig', () => {
  let tree: Tree;
  let schema: Schema;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();

    schema = {
      projectName: 'my-lib',
      skipFormat: false,
      forceRemove: false,
    };

    await libraryGenerator(tree, {
      name: 'my-lib',
    });
    await libraryGenerator(tree, {
      name: 'my-other-lib',
    });

    tree.write(
      'jest.config.js',
      readFileSync(join(__dirname, './test-files/jest.config.js')).toString()
    );
  });

  it('should delete lib project ref from root jest config', async () => {
    const jestConfig = tree.read('jest.config.js').toString();

    expect(jestConfig).toMatchSnapshot();

    updateJestConfig(tree, schema, readProjectConfiguration(tree, 'my-lib'));

    const updatedJestConfig = tree.read('jest.config.js').toString();

    expect(updatedJestConfig).toMatchSnapshot();

    updateJestConfig(
      tree,
      { ...schema, projectName: 'my-other-lib' },
      readProjectConfiguration(tree, 'my-other-lib')
    );

    const updatedJestConfig2 = tree.read('jest.config.js').toString();

    expect(updatedJestConfig2).toMatchSnapshot();
  });
});
