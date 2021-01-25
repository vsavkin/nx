import * as path from 'path';
import * as fs from 'fs';
import { Workspace } from './workspace';
import { parseRunOneOptions } from './parse-run-one-options';

/**
 * Nx is being run inside a workspace.
 *
 * @param workspace Relevant local workspace properties
 */
process.env.NX_CLI_SET = 'true';

export function initLocal(workspace: Workspace) {
  require('@nrwl/workspace/' + 'src/utilities/perf-logging');
  require('@nrwl/tao/src/compat/compat.js');

  const supportedNxCommands = require('@nrwl/workspace/' +
    'src/command-line/supported-nx-commands').supportedNxCommands;

  const runOpts = runOneOptions(workspace);
  const running = runOpts !== false;

  if (supportedNxCommands.includes(process.argv[2])) {
    // required to make sure nrwl/workspace import works
    require('@nrwl/workspace' + '/src/command-line/nx-commands').commandsObject
      .argv;
  } else if (running) {
    require('@nrwl/workspace' + '/src/command-line/run-one').runOne(runOpts);
  } else if (generating()) {
    loadCli(workspace, '@nrwl/tao/index.js');
  } else {
    if (workspace.type === 'nx') {
      loadCli(workspace, '@nrwl/tao/index.js');
    } else {
      if (
        process.argv[2] === 'update' &&
        process.env.FORCE_NG_UPDATE != 'true'
      ) {
        console.log(
          `Nx provides a much improved version of "ng update". It runs the same migrations, but allows you to:`
        );
        console.log(`- rerun the same migration multiple times`);
        console.log(`- reorder migrations`);
        console.log(`- skip migrations`);
        console.log(`- fix migrations that "almost work"`);
        console.log(`- commit a partially migrated state`);
        console.log(`- change versions of packages to match org requirements`);
        console.log(
          `And, in general, it is lot more reliable for non-trivial workspaces. Read more at: https://nx.dev/latest/angular/workspace/update`
        );
        console.log(
          `Run "nx migrate latest" to update to the latest version of Nx.`
        );
        console.log(
          `If you still want to use "ng update", run "FORCE_NG_UPDATE=true ng update".`
        );
      } else {
        loadCli(workspace, '@angular/cli/lib/init.js');
      }
    }
  }
}

function loadCli(workspace: Workspace, cliPath: string) {
  try {
    const cli = require.resolve(cliPath, { paths: [workspace.dir] });
    require(cli);
  } catch (e) {
    console.error(`Could not find ${cliPath} module in this workspace.`, e);
    process.exit(1);
  }
}

function runOneOptions(
  workspace: Workspace
): false | { project; target; configuration; parsedArgs } {
  try {
    const workspaceConfigJson = JSON.parse(
      fs
        .readFileSync(
          path.join(
            workspace.dir,
            workspace.type === 'nx' ? 'workspace.json' : 'angular.json'
          )
        )
        .toString()
    );

    return parseRunOneOptions(
      workspace.dir,
      workspaceConfigJson,
      process.argv.slice(2)
    );
  } catch (e) {
    return false;
  }
}

function generating(): boolean {
  const command = process.argv.slice(2)[0];
  return command === 'g' || command === 'generate';
}
