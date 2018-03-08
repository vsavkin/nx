Bazel Commands

## Add new app
node_modules/.bin/ng generate app [name] --collection=@nrwl/bazel

Example: node_modules/.bin/ng generate app test --collection=@nrwl/bazel

## Add new component
node_modules/.bin/ng generate component [name] --collection=@nrwl/bazel --directory=[dir]

Example: node_modules/.bin/ng generate component friends --collection=@nrwl/bazel --directory=myDir
* must manually import the component's Bazel rule in the consuming Bazel rule

## Add new lib
node_modules/.bin/ng generate lib  [name] --collection=@nrwl/bazel

Example: node_modules/.bin/ng generate lib  mylib --collection=@nrwl/bazel
* must manually import the lib's Bazel rule in the consuming Bazel rule

## Run dev server
ibazel run apps/[app specific path]]/src:devserver (anything between apps/**/src points to a specific app)

Example: ibazel run apps/my-dir/my-app/src:devserver

## Run prod server
bazel run apps/[app specific path]]/src:prodserver (anything between apps/**/src points to a specific app)

Example: bazel run apps/my-dir/my-app/src:prodserver

## Run unit tests
ibazel test //libs/mylib/src:test
* currently works for libs

