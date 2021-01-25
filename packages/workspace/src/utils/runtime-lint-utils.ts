import * as path from 'path';
import { FileData } from '../core/file-utils';
import {
  DependencyType,
  isWorkspaceProject,
  ProjectGraph,
  ProjectGraphDependency,
  ProjectGraphNode,
} from '../core/project-graph';
import { TargetProjectLocator } from '../core/target-project-locator';

export type Deps = { [projectName: string]: ProjectGraphDependency[] };
export type DepConstraint = {
  sourceTag: string;
  onlyDependOnLibsWithTags: string[];
};

export function hasNoneOfTheseTags(proj: ProjectGraphNode, tags: string[]) {
  return tags.filter((allowedTag) => hasTag(proj, allowedTag)).length === 0;
}

function hasTag(proj: ProjectGraphNode, tag: string) {
  return (proj.data.tags || []).indexOf(tag) > -1 || tag === '*';
}

function containsFile(
  files: FileData[],
  targetFileWithoutExtension: string
): boolean {
  return !!files.filter(
    (f) => removeExt(f.file) === targetFileWithoutExtension
  )[0];
}

function removeExt(file: string): string {
  return file.replace(/\.[^/.]+$/, '');
}

function removeWindowsDriveLetter(osSpecificPath: string): string {
  return osSpecificPath.replace(/^[A-Z]:/, '');
}

function normalizePath(osSpecificPath: string): string {
  return removeWindowsDriveLetter(osSpecificPath).split(path.sep).join('/');
}

export function matchImportWithWildcard(
  // This may or may not contain wildcards ("*")
  allowableImport: string,
  extractedImport: string
): boolean {
  if (allowableImport.endsWith('/**')) {
    const prefix = allowableImport.substring(0, allowableImport.length - 2);
    return extractedImport.startsWith(prefix);
  } else if (allowableImport.endsWith('/*')) {
    const prefix = allowableImport.substring(0, allowableImport.length - 1);
    if (!extractedImport.startsWith(prefix)) return false;
    return extractedImport.substring(prefix.length).indexOf('/') === -1;
  } else if (allowableImport.indexOf('/**/') > -1) {
    const [prefix, suffix] = allowableImport.split('/**/');
    return (
      extractedImport.startsWith(prefix) && extractedImport.endsWith(suffix)
    );
  } else {
    return new RegExp(allowableImport).test(extractedImport);
  }
}

export function isRelative(s: string) {
  return s.startsWith('.');
}

export function isRelativeImportIntoAnotherProject(
  imp: string,
  projectPath: string,
  projectGraph: ProjectGraph,
  sourceFilePath: string
): boolean {
  if (!isRelative(imp)) return false;

  const targetFile = normalizePath(
    path.resolve(path.join(projectPath, path.dirname(sourceFilePath)), imp)
  ).substring(projectPath.length + 1);

  const sourceProject = findSourceProject(projectGraph, sourceFilePath);
  const targetProject = findTargetProject(projectGraph, targetFile);
  return sourceProject && targetProject && sourceProject !== targetProject;
}

export function findProjectUsingFile(projectGraph: ProjectGraph, file: string) {
  return Object.values(projectGraph.nodes).filter((n) =>
    containsFile(n.data.files, file)
  )[0];
}

export function findSourceProject(
  projectGraph: ProjectGraph,
  sourceFilePath: string
) {
  const targetFile = removeExt(sourceFilePath);
  return findProjectUsingFile(projectGraph, targetFile);
}

export function findTargetProject(
  projectGraph: ProjectGraph,
  targetFile: string
) {
  let targetProject = findProjectUsingFile(projectGraph, targetFile);
  if (!targetProject) {
    targetProject = findProjectUsingFile(
      projectGraph,
      normalizePath(path.join(targetFile, 'index'))
    );
  }
  if (!targetProject) {
    targetProject = findProjectUsingFile(
      projectGraph,
      normalizePath(path.join(targetFile, 'src', 'index'))
    );
  }
  return targetProject;
}

export function isAbsoluteImportIntoAnotherProject(imp: string) {
  // TODO: vsavkin: check if this needs to be fixed once we generalize lint rules
  return (
    imp.startsWith('libs/') ||
    imp.startsWith('/libs/') ||
    imp.startsWith('apps/') ||
    imp.startsWith('/apps/')
  );
}

export function findProjectUsingImport(
  projectGraph: ProjectGraph,
  targetProjectLocator: TargetProjectLocator,
  filePath: string,
  imp: string,
  npmScope: string
) {
  const target = targetProjectLocator.findProjectWithImport(
    imp,
    filePath,
    npmScope
  );
  return projectGraph.nodes[target];
}

export function checkCircularPath(
  graph: ProjectGraph,
  sourceProject: ProjectGraphNode,
  targetProject: ProjectGraphNode
): Array<ProjectGraphNode> {
  if (!graph.nodes[targetProject.name]) return [];
  return getPath(graph, targetProject.name, sourceProject.name);
}

interface Reach {
  graph: ProjectGraph;
  matrix: Record<string, Array<string>>;
  adjList: Record<string, Array<string>>;
}

const reach: Reach = {
  graph: null,
  matrix: null,
  adjList: null,
};

function buildMatrix(graph: ProjectGraph) {
  const dependencies = graph.dependencies;
  const nodes = Object.keys(graph.nodes).filter((s) =>
    isWorkspaceProject(graph.nodes[s])
  );
  const adjList = {};
  const matrix = {};

  const initMatrixValues = nodes.reduce((acc, value) => {
    return {
      ...acc,
      [value]: false,
    };
  }, {});

  nodes.forEach((v, i) => {
    adjList[nodes[i]] = [];
    matrix[nodes[i]] = { ...initMatrixValues };
  });

  for (let proj in dependencies) {
    for (let dep of dependencies[proj]) {
      if (isWorkspaceProject(graph.nodes[dep.target])) {
        adjList[proj].push(dep.target);
      }
    }
  }

  const traverse = (s, v) => {
    matrix[s][v] = true;

    for (let adj of adjList[v]) {
      if (matrix[s][adj] === false) {
        traverse(s, adj);
      }
    }
  };

  nodes.forEach((v, i) => {
    traverse(nodes[i], nodes[i]);
  });

  return {
    matrix,
    adjList,
  };
}

function getPath(
  graph: ProjectGraph,
  sourceProjectName: string,
  targetProjectName: string
): Array<ProjectGraphNode> {
  if (sourceProjectName === targetProjectName) return [];

  if (reach.graph !== graph) {
    const result = buildMatrix(graph);
    reach.graph = graph;
    reach.matrix = result.matrix;
    reach.adjList = result.adjList;
  }

  const adjList = reach.adjList;

  let path: string[] = [];
  const queue: Array<[string, string[]]> = [[sourceProjectName, path]];
  const visited: string[] = [sourceProjectName];

  while (queue.length > 0) {
    const [current, p] = queue.pop();
    path = [...p, current];

    if (current === targetProjectName) break;

    adjList[current]
      .filter((adj) => visited.indexOf(adj) === -1)
      .filter((adj) => reach.matrix[adj][targetProjectName])
      .forEach((adj) => {
        visited.push(adj);
        queue.push([adj, [...path]]);
      });
  }

  if (path.length > 1) {
    return path.map((n) => graph.nodes[n]);
  } else {
    return [];
  }
}

export function findConstraintsFor(
  depConstraints: DepConstraint[],
  sourceProject: ProjectGraphNode
) {
  return depConstraints.filter((f) => hasTag(sourceProject, f.sourceTag));
}

export function onlyLoadChildren(
  graph: ProjectGraph,
  sourceProjectName: string,
  targetProjectName: string,
  visited: string[]
) {
  if (visited.indexOf(sourceProjectName) > -1) return false;
  return (
    (graph.dependencies[sourceProjectName] || []).filter((d) => {
      if (d.type !== DependencyType.dynamic) return false;
      if (d.target === targetProjectName) return true;
      return onlyLoadChildren(graph, d.target, targetProjectName, [
        ...visited,
        sourceProjectName,
      ]);
    }).length > 0
  );
}

export function getSourceFilePath(sourceFileName: string, projectPath: string) {
  return path.normalize(sourceFileName).substring(projectPath.length + 1);
}

/**
 * Verifies whether the given node has an architect builder attached
 * @param projectGraph the node to verify
 */
export function hasBuildExecutor(projectGraph: ProjectGraphNode): boolean {
  return (
    // can the architect not be defined? real use case?
    projectGraph.data.targets &&
    projectGraph.data.targets.build &&
    projectGraph.data.targets.build.executor !== ''
  );
}
