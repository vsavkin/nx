import {apply, branchAndMerge, chain, externalSchematic, filter, MergeStrategy, mergeWith, move, noop, Rule, template, Tree, url, SchematicContext, TemplateOptions} from '@angular-devkit/schematics';
import {Schema} from './schema';
import {strings} from '@angular-devkit/core';
import {addImportToModule, insert, toFileName} from '@nrwl/schematics';
import * as ts from 'typescript';
import {addBootstrapToModule} from '@schematics/angular/utility/ast-utils';
import {insertImport} from '@schematics/angular/utility/route-utils';
import {addApp, serializeJson, cliConfig, readCliConfigFile} from '../../../../shared/fileutils';
import {addImportToTestBed} from '../../../../shared/ast-utils';
import {offsetFromRoot} from '../../../../shared/common';
import {FormatFiles, wrapIntoFormat} from '../../../../shared/tasks';
import * as fs from 'fs';

interface NormalizedSchema extends Schema {
  fullName: string;
  fullPath: string;
}

function addBazelBuildFile(path: string, componentName: string): Rule {
  return (host: Tree) => {
    const ngModule = `package(default_visibility = ["//visibility:public"])

load("@angular//:index.bzl", "ng_module")
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library", "ts_web_test")

ng_module(
    name = "${componentName}",
    srcs = glob(
        ["*.ts"],
        exclude = ["*.spec.ts"],
    ),
    assets = [
        "${componentName}.component.css",
        "${componentName}.component.html",
    ],
    deps = [
        "@rxjs",
    ],
)

ts_library(
    name = "test_lib",
    testonly = 1,
    srcs = glob(["*.spec.ts"]),
    deps = [
        ":${componentName}",
    ],
)
`;

    const sourceFile = host.create(`${path}/BUILD.bazel`, ngModule);
  };
}

export default function(schema: Schema): Rule {
  return wrapIntoFormat(() => {
    const componentPath = `/${schema.sourceDir}/${schema.path}/` +
        (schema.flat ? '' : strings.dasherize(schema.name));

    return chain([
      externalSchematic('@schematics/angular', 'component', schema),
      addBazelBuildFile(componentPath, strings.dasherize(schema.name)),
    ]);
  });
}
