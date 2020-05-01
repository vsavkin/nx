import {
  apply,
  chain,
  externalSchematic,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { join, normalize, Path } from '@angular-devkit/core';
import { Schema } from './schema';
import { formatFiles, toFileName, updateJsonInTree } from '@nrwl/workspace';
import init from '../init/init';

interface NormalizedSchema extends Schema {
  appProjectRoot: Path;
}

function addMainFile(options: NormalizedSchema): Rule {
  return (host: Tree) => {
    host.overwrite(
      join(options.appProjectRoot, 'src/main.ts'),
      `/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3333;
  await app.listen(port, () => {
    Logger.log('Listening at http://localhost:' + port + '/' + globalPrefix);
  });
}

bootstrap();
    `
    );
  };
}

function addAppFiles(options: NormalizedSchema): Rule {
  return mergeWith(
    apply(url(`./files`), [
      template({
        tmpl: '',
        name: options.name,
        root: options.appProjectRoot,
      }),
      move(join(options.appProjectRoot, 'src')),
    ])
  );
}

export default function (schema: Schema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const options = normalizeOptions(schema);
    return chain([
      init({
        ...options,
        skipFormat: true,
      }),
      externalSchematic('@nrwl/node', 'application', schema),
      addMainFile(options),
      addAppFiles(options),
      updateJsonInTree(
        join(options.appProjectRoot, 'tsconfig.json'),
        (json) => {
          json.compilerOptions.emitDecoratorMetadata = true;
          json.compilerOptions.target = 'es2015';
          return json;
        }
      ),
      formatFiles(options),
    ])(host, context);
  };
}

function normalizeOptions(options: Schema): NormalizedSchema {
  const appDirectory = options.directory
    ? `${toFileName(options.directory)}/${toFileName(options.name)}`
    : toFileName(options.name);
  const appProjectRoot = join(normalize('apps'), appDirectory);

  return {
    ...options,
    appProjectRoot,
  };
}
