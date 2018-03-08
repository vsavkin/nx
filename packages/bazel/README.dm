Bazel Commands

## Add new app
node_modules/.bin/ng generate app [name] --collection=@nrwl/bazel

## Run dev server
ibazel run apps/[app specific path]]/src:devserver (anything between apps/**/src points to a specific app)
Example: bazel run apps/my-dir/my-app/src:devserver

## Run prod server
bazel run apps/my-dir/my-app/src:prodserver

