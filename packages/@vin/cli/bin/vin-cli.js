#!/usr/bin/env node

const program = require("commander");
const chalk = require("chalk");

program
  .version(require("../package.json").version)
  .usage("<command> [options]");

program
  .command("create <app-name>")
  .description("使用vin-cli 创建一个新项目")
  .option("-g, --git [message]", "使用初始化提交消息强制执行git提交")
  .option("-f, --force", "如果目标文件夹已存在就强制移除")
  .action((name, cmd) => {
    const options = cleanArgs(cmd);
    console.log(chalk.green(`\n开始创建项目${name}...`));
    // TODO: 参数校验
    require("../lib/create")(name, options);
  });

program.parse(process.argv);

function cleanArgs(cmd) {
  let args = {};
  cmd.options.forEach((o) => {
    let key = o.long.replace(/^--/, "");
    if (typeof cmd[key] !== "function" && typeof cmd[key] !== "undefined") {
      args[key] = cmd[key];
    }
  });
  return args;
}
