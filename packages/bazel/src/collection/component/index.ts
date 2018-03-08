import {
  apply,
  branchAndMerge,
  chain,
  externalSchematic,
  filter,
  MergeStrategy,
  mergeWith,
  move,
  noop,
  Rule,
  template,
  Tree,
  url,
  SchematicContext,
  TemplateOptions,
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import { strings } from '@angular-devkit/core';
import { addImportToModule, insert, toFileName } from '@nrwl/schematics';
import * as ts from 'typescript';
import { addBootstrapToModule } from '@schematics/angular/utility/ast-utils';
import { insertImport } from '@schematics/angular/utility/route-utils';
import {
  addApp,
  serializeJson,
  cliConfig,
  readCliConfigFile
} from '../../../../shared/fileutils';
import { addImportToTestBed } from '../../../../shared/ast-utils';
import { offsetFromRoot } from '../../../../shared/common';
import { FormatFiles, wrapIntoFormat } from '../../../../shared/tasks';
import * as fs from 'fs';

interface NormalizedSchema extends Schema {
  fullName: string;
  fullPath: string;
}

function addComponentModule(modulePath: string, schema: Schema): Rule {
  return (host: Tree) => {
    const componentClass = `${strings.classify(schema.name)}Component`;

    const ngModule = `import { NgModule } from '@angular/core';
import {${componentClass}} from './${strings.dasherize(schema.name)}.component';

@NgModule({
    declarations: [${componentClass}],
    ${schema.export ? `exports: [${componentClass}],` : ''}
})
export class ${strings.classify(schema.name)}Module {}    
`;

    const sourceFile = host.create(modulePath, ngModule);
  };
}

function addBazelBuildFile(buildFilePath: string, schema: Schema): Rule {
  const dasherizedName = strings.dasherize(schema.name);

  return (host: Tree) => {
    const ngModule = `package(default_visibility = ["//visibility:public"])

load("@angular//:index.bzl", "ng_module")
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library", "ts_web_test")

ng_module(
    name = "${dasherizedName}",
    srcs = glob(
        ["*.ts"],
        exclude = ["*.spec.ts"],
    ),
    assets = [
        "${dasherizedName}.component.css",
        "${dasherizedName}.component.html",
    ],
    deps = [
        "@rxjs",
    ],
)
${
      schema.spec
        ? `ts_library(
    name = "test_lib",
    testonly = 1,
    srcs = glob(["*.spec.ts"]),
    deps = [
        ":${dasherizedName}",
    ],
)`
        : ''
      }
`;

    const sourceFile = host.create(buildFilePath, ngModule);
  };
}

export default function (schema: Schema): Rule {
  return wrapIntoFormat(() => {
    const componentDirectoryPath =
      `/${schema.sourceDir}/${schema.path}/` +
      (schema.flat ? '' : strings.dasherize(schema.name));

    const modulePath = `${componentDirectoryPath}/${strings.dasherize(
      schema.name
    )}.module.ts`;
    const buildFilePath = `${componentDirectoryPath}/BUILD.bazel`;

    return chain([
      externalSchematic('@schematics/angular', 'component', {
        ...schema,
        skipImport: true
      }),
      ...(schema.module
        ? []
        : [
          addComponentModule(modulePath, schema),
          addBazelBuildFile(buildFilePath, schema)
        ])
    ]);
  });
}
