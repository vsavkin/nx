import {checkFilesExist, newApp, newBazelProject, newLib, runCLI, updateFile} from '../utils';

describe('Nrwl Workspace (Bazel)', () => {
  it('should work', () => {
    newBazelProject();
    newApp(
        'myApp --directory=myDir',
        '--collection=@nrwl/bazel',
    );
    newLib('myLib --directory=myDir', '@nrwl/bazel');

    checkFilesExist('WORKSPACE', 'BUILD.bazel');
  }, 1000000);
});
