const defaults = {
  clean: true,
  target: "app",
  formats: "commonjs,umd,umd-min",
  "unsafe-inline": true,
};

const modifyConfig = (config, fn) => {
  if (Array.isArray(config)) {
    config.forEach((c) => fn(c));
  } else {
    fn(config);
  }
};

module.exports = (api, options) => {
  api.registerCommand("build", {}, async (args) => {
    for (let key in defaults) {
      if (!args[key]) {
        args[key] = defaults[key];
      }
    }

    args.entry = args.entry || args._[0];

    process.env.VUE_CLI_BUILD_TARGET = args.target;

    await build(
      Object.assign({}, args, {
        modernBuild: true,
        clean: false,
      }),
      api,
      options
    );

    delete process.env.VUE_CLI_BUILD_TARGET;
  });
};

async function build(args, api, options) {
  const fs = require("fs-extra");
  const path = require("path");
  const chalk = require("chalk");
  const webpack = require("webpack");
  const formatStats = require("./formatStats");

  const validateWebpackConfig = require("../../util/validateWebpackConfig");

  console.log();
  const mode = api.service.mode;
  console.log(chalk.white(`打包模式：modern bundle   Mode: ${mode}`));
  console.log();

  const targetDir = api.resolve(options.outputDir);

  let webpackConfig;
  webpackConfig = require("./resolveAppConfig")(api, args, options);

  validateWebpackConfig(webpackConfig, api, options, args.target);

  if (args.watch) {
    modifyConfig(webpackConfig, (config) => {
      config.watch = true;
    });
  }

  if (args.clean) {
    await fs.remove(targetDir);
  }

  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(`构建报错`);
      }

      if (!args.silent) {
        const targetDirShort = path.relative(api.service.context, targetDir);
        console.log(formatStats(stats, targetDirShort, api));

        if (!args.watch) {
          console.log(
            chalk.green(`构建完成，${targetDirShort} 目录已经准备好部署啦～`)
          );
        } else {
          console.log(`构建完成，监听变化中...`);
        }
      }

      resolve();
    });
  });
}

module.exports.defaultModes = {
  build: "production",
};
