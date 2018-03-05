import {checkFilesExist, newApp, newBazelProject, newLib, runCLI, updateFile} from '../utils';

describe('Nrwl Workspace (Bazel)', () => {
  it('should work', () => {
    newBazelProject();
    newApp(
        'myApp --directory=myDir',
        '--collection=@nrwl/bazel --npmScope=proj',
    );
    newLib('myLib --directory=myDir');

    checkFilesExist('WORKSPACE', 'BUILD.bazel');
  }, 1000000);
});
