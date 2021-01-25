import { assertWorkspaceValidity } from './assert-workspace-validity';
import { output } from '../utilities/output';

describe('assertWorkspaceValidity', () => {
  let mockNxJson: any;
  let mockWorkspaceJson: any;

  beforeEach(() => {
    mockNxJson = {
      projects: {
        app1: {
          tags: [],
        },
        'app1-e2e': {
          tags: [],
        },
        app2: {
          tags: [],
        },
        'app2-e2e': {
          tags: [],
        },
        lib1: {
          tags: [],
        },
        lib2: {
          tags: [],
        },
      },
    };
    mockWorkspaceJson = {
      projects: {
        app1: {},
        'app1-e2e': {},
        app2: {},
        'app2-e2e': {},
        lib1: {},
        lib2: {},
      },
    };
  });

  it('should not throw for a valid workspace', () => {
    assertWorkspaceValidity(mockWorkspaceJson, mockNxJson);
  });

  it('should throw for a missing project in workspace.json', () => {
    spyOn(output, 'error');
    delete mockWorkspaceJson.projects.app1;

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {}) as any);
    assertWorkspaceValidity(mockWorkspaceJson, mockNxJson);

    expect(output.error).toHaveBeenCalledWith({
      title: 'Configuration Error',
      bodyLines: [
        `workspace.json and nx.json are out of sync. The following projects are missing in workspace.json: app1`,
      ],
    });
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('should throw for a missing project in nx.json', () => {
    spyOn(output, 'error');

    delete mockNxJson.projects.app1;

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {}) as any);
    assertWorkspaceValidity(mockWorkspaceJson, mockNxJson);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(output.error).toHaveBeenCalledWith({
      title: 'Configuration Error',
      bodyLines: [
        `workspace.json and nx.json are out of sync. The following projects are missing in nx.json: app1`,
      ],
    });
    mockExit.mockRestore();
  });

  it('should throw for an invalid top-level implicit dependency', () => {
    spyOn(output, 'error');
    mockNxJson.implicitDependencies = {
      'README.md': ['invalidproj'],
    };

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {}) as any);
    assertWorkspaceValidity(mockWorkspaceJson, mockNxJson);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(output.error).toHaveBeenCalledWith({
      title: 'Configuration Error',
      bodyLines: [
        `The following implicitDependencies specified in nx.json are invalid:
    README.md
        invalidproj`,
      ],
    });
    mockExit.mockRestore();
  });

  it('should throw for an invalid project-level implicit dependency', () => {
    spyOn(output, 'error');
    mockNxJson.projects.app2.implicitDependencies = ['invalidproj'];

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {}) as any);
    assertWorkspaceValidity(mockWorkspaceJson, mockNxJson);

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(output.error).toHaveBeenCalledWith({
      title: 'Configuration Error',
      bodyLines: [
        `The following implicitDependencies specified in nx.json are invalid:
    app2
        invalidproj`,
      ],
    });
    mockExit.mockRestore();
  });
});
