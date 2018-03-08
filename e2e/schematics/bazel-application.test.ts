import {
  checkFilesExist,
  newApp,
  newBazelProject,
  newComponent,
  newLib,
  runCLI,
  runCommand,
  updateFile
} from '../utils';

function itShould(testDescription, test) {
  return it(`should ${testDescription}`, test, 100000);
}

describe('Nrwl Workspace (Bazel)', () => {
  afterEach(() => {
    runCommand('bazel build ...');
  });

  itShould('create a bazel project', () => {
    newBazelProject();
    checkFilesExist('WORKSPACE', 'BUILD.bazel');
  });

  itShould('create an app', () => {
    newApp('myApp --directory=myDir', '--collection=@nrwl/bazel');
  });

  itShould('create a lib', () => {
    newLib('myLib --directory=myDir', '@nrwl/bazel');

    runCommand('bazel test //libs/my-dir/my-lib/src:test');
  });

  itShould('allow adding a lib to a module', () => {
    updateFile(
      'apps/my-dir/my-app/src/app/app.module.ts',
      `import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MyLibModule } from 'proj/libs/my-dir/my-lib/src/my-lib.module';
import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';

@NgModule({
imports: [BrowserModule, MyLibModule, StoreModule.forRoot({})],
declarations: [AppComponent],
bootstrap: [AppComponent]
})
export class AppModule {}
`
    );

    // TODO: Replace this with a buildozer command to add the lib as a dep.
    updateFile(
      'apps/my-dir/my-app/src/app/BUILD.bazel',
      `
package(default_visibility = ["//visibility:public"])

load("@angular//:index.bzl", "ng_module")

ng_module(
 name = "app",
 srcs = glob(
     ["*.ts"],
     exclude = ["*.spec.ts"],
 ),
 assets = [
     "app.component.css",
     "app.component.html",
 ],
 deps = [
   "//libs/my-dir/my-lib/src",
   "@rxjs",
 ],
)
`
    );
  });

  itShould('add a component', () => {
    newComponent('helloWorld --directory=myDir', '@nrwl/bazel');
  });

  itShould('run protractor', () => {
    runCommand(
      [
        'node',
        'node_modules/concurrently/src/main.js',
        '"bazel run //src:prodserver"',
        '"while ! nc -z 127.0.0.1 8080; do sleep 1; done && ng e2e -s=false --app=my-dir/my-app"',
        '--kill-others',
        '--success',
        'first'
      ].join(' ')
    );
  });
});
