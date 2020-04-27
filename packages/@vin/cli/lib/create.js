const validName = require('validate-npm-package-name');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const translate = require('translate-google');
const inquirer = require('inquirer');
const Creator = require('./Creator');


async function create(name, options) {
  const cwd = options.cwd || process.cwd();
  const targetDir = path.resolve(cwd, name);

  // 校验name 是否合法
  const result = validName(name);
  if (!result.validForNewPackages) {
    console.log(chalk.red(`项目名称${name}非法`));
    result.errors && result.errors.forEach(m => {
      translate(m, { to: 'zh-cn' }).then(res => {
        console.log(chalk.red('Error: ' + res));
      });
    })
    result.warnings && result.warnings.forEach(m => {
      translate(m, { to: 'zh-cn' }).then(res => {
        console.log(chalk.yellow('Warning: ' + res));
      }).finally(() => {
        process.exit(1);
      })
    })
  }

  // TODO: 文件已存在
  if (fs.existsSync(targetDir)) {
    if (options.force) {
      await fs.remove(targetDir);
    } else {
      const { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: `目标路径 ${chalk.cyan(
            targetDir
          )} 已经存在，请选择一个操作:`,
          choices: [
            { name: '复写', value: 'overwrite' },
            { name: '合并', value: 'merge' },
            { name: '取消', value: false }
          ]
        }
      ])
      if (!action) {
        return
      } else if (action === 'overwrite') {
        console.log(`正在删除 ${chalk.cyan(targetDir)}...`)
        await fs.remove(targetDir)
      }
    }
  }


  const creator = new Creator(name, targetDir);
  creator.create(options);
}


module.exports = (...args) => {
  return create(...args).catch(e => {
    // console.log(e);
    process.exit(1);
  })
}

