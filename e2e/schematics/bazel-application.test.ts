import {checkFilesExist, newApp, newBazelProject, newComponent, newLib, runCLI, runCommand, updateFile} from '../utils';

describe('Nrwl Workspace (Bazel)', () => {
  it('should add eagerly loaded bazel application with @ngrx and nx lib',
     () => {
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
import { StoreModule } from '@ngrx/store';

@NgModule({
  imports: [BrowserModule, MyLibModule, StoreModule.forRoot({})],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {}`);

       updateFile('apps/my-dir/my-app/src/app/BUILD.bazel', `
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
    `);
       runCommand('bazel build ...');

       // Commands to run web servers for dev and prod
       // bazel run apps/my-dir/my-app/src:devserver
       // bazel run apps/my-dir/my-app/src:prodserver
       runCommand('bazel test ...');

       newComponent('helloWorld --directory=myDir', '@nrwl/bazel');

       runCommand('bazel build ...');
     },
     1000000);
});
