import {checkFilesExist, newApp, newBazelProject, newLib, runCLI, runCommand, updateFile} from '../utils';

describe('Nrwl Workspace (Bazel)', () => {
  it('should work', () => {
    newBazelProject();
    newApp(
        'myApp --directory=myDir',
        '--collection=@nrwl/bazel',
    );
    checkFilesExist('WORKSPACE', 'BUILD.bazel');

    newLib('myLib --directory=myDir', '@nrwl/bazel');
    runCommand('bazel build ...');

    updateFile(
        'apps/my-dir/my-app/src/app/app.module.ts',
        `import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MyLibModule } from 'proj/libs/my-dir/my-lib/src/my-lib.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [BrowserModule, MyLibModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {}`);

    updateFile('apps/my-dir/my-app/src/app/BUILD.bazel', `
package(default_visibility = ["//visibility:public"])

load("@angular//:index.bzl", "ng_module")

ng_module(
    name = "app",
    srcs = glob(["*.ts"]),
    assets = [
        "app.component.css",
        "app.component.html",
    ],
    deps = [
      "//libs/my-dir/my-lib/src",
      "@rxjs",
    ],
)
    `);
    runCommand('bazel build ...');
    // runCommand('bazel run apps/my-dir/my-app/src:src_devserver');
  }, 1000000);
});
