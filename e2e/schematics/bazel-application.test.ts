import {checkFilesExist, newApp, newBazelProject, newLib, runCLI, runCommand, updateFile} from '../utils';

describe('Nrwl Workspace (Bazel)', () => {
  it('should work', () => {
    newBazelProject();
    newApp(
        'myApp --directory=myDir',
        '--collection=@nrwl/bazel',
    );
    newLib('myLib --directory=myDir', '@nrwl/bazel');

    checkFilesExist('WORKSPACE', 'BUILD.bazel');

    runCommand('bazel build ...');
    // runCommand('bazel run apps/my-dir/my-app/src:src_devserver');
  }, 1000000);
});
