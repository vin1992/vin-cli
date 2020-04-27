#!/usr/bin/env node
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;
const chalk = require('chalk');

if (!semver.satisfies(process.version, requiredVersion)) {
  console.log(chalk(`
    你正在使用 ${process.version} 版本的Node, 但是 vin-cli 需要 ${requiredVersion} 的Node, 请升级你的node版本
  `));
  process.exit(1);
}

const Service = require('../lib/Service');
const service = new Service(process.env.VUE_CLI_CONTEXT || process.cwd());

const rawArgv = process.argv.slice(2);
const args = require('minimist')(rawArgv, {
  boolean: [
    'watch',
    'report'
  ]
})

const command = args._[0];

service.run(command, args, rawArgv).catch(err => {
  console.log(err);
  process.exit(1);
})