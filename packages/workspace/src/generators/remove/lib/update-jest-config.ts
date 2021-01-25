import {
  applyChangesToString,
  ChangeType,
  ProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { getSourceNodes } from '@nrwl/workspace/src/utils/ast-utils';

import { Schema } from '../schema';
import {
  ArrayLiteralExpression,
  createSourceFile,
  isArrayLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  PropertyAssignment,
  ScriptTarget,
  StringLiteral,
} from 'typescript';

/**
 * Updates the root jest config projects array and removes the project.
 */
export function updateJestConfig(
  tree: Tree,
  schema: Schema,
  projectConfig: ProjectConfiguration
) {
  const projectToRemove = schema.projectName;

  if (!tree.exists('jest.config.js')) {
    return;
  }

  const contents = tree.read('jest.config.js').toString();
  const sourceFile = createSourceFile(
    'jest.config.js',
    contents,
    ScriptTarget.Latest
  );

  const sourceNodes = getSourceNodes(sourceFile);

  const projectsAssignment = sourceNodes.find(
    (node) =>
      isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === 'projects' &&
      isArrayLiteralExpression(node.initializer)
  ) as PropertyAssignment;

  if (!projectsAssignment) {
    throw Error(
      `Could not remove ${projectToRemove} from projects in /jest.config.js. Please remove ${projectToRemove} from your projects.`
    );
  }
  const projectsArray = projectsAssignment.initializer as ArrayLiteralExpression;

  const project = projectsArray.elements.find(
    (item) =>
      isStringLiteral(item) &&
      item.text.startsWith(`<rootDir>/${projectConfig.root}`)
  ) as StringLiteral;

  if (!project) {
    console.warn(
      `Could not find ${projectToRemove} in projects in /jest.config.js.`
    );
  }

  const previousProject =
    projectsArray.elements[projectsArray.elements.indexOf(project) - 1];

  const start = previousProject
    ? previousProject.getEnd()
    : project.getStart(sourceFile);

  tree.write(
    'jest.config.js',
    applyChangesToString(contents, [
      {
        type: ChangeType.Delete,
        start,
        length: project.getEnd() - start,
      },
    ])
  );
}
