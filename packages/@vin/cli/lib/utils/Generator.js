const GeneratorAPI = require('./GeneratorAPI');
const normalizeFilePaths = require('./normalizeFilePaths');
const writeFileTree = require('./writeFileTree');
const sortObject = require('./sortObject');

module.exports = class Generator {
  constructor (context, { pkg = {}, plugins = [], invoking = false, files = {} } = {}) {
    this.context = context;
    this.pkg = pkg;
    this.plugins = plugins;
    this.invoking = invoking;
    this.fileMiddleWares = [];
    this.files = files;
    const cliService = plugins.find(p => p.id === 'vin-cli-service');
    const rootOptions = cliService ? cliService.options : inferRootOptions(pkg);

    this.rootOptions = rootOptions;
  }


  async generate({
    extractConfigFiles = false,
    checkExisting = false
  } = {}) {
    await this.initPlugins();

    const initialFiles = Object.assign({}, this.files);

    // this.extractConfigFiles(extractConfigFiles, checkExisting); 

    //等待 虚拟文件树 生成
    await this.resolveFiles();

    // package.json 排序
    this.sortPkg();
    this.files['package.json'] = JSON.stringify(this.pkg, null, 2) + '\n';

    // 将文件 写入 硬盘
    await writeFileTree(this.context, this.files, initialFiles);

  }


  async initPlugins() {
    const { rootOptions, invoking } = this;

    for (const plugin of this.plugins) {
      const { id, apply, options } = plugin;
      const api = new GeneratorAPI(id, this, options, rootOptions);
      await apply(api, options, rootOptions, invoking);
    }
  }

  async resolveFiles() {
    const files = this.files;

    for (const middleware of this.fileMiddleWares) {
      await middleware(files)
    }

    normalizeFilePaths(files);

    //TODO: handle imports and root option injections

  }

  sortPkg() {
    // ensure package.json keys has readable order
    this.pkg.dependencies = sortObject(this.pkg.dependencies)
    this.pkg.devDependencies = sortObject(this.pkg.devDependencies)
    this.pkg.scripts = sortObject(this.pkg.scripts, [
      'serve',
      'build',
      'test',
      'e2e',
      'lint',
      'deploy'
    ])
    this.pkg = sortObject(this.pkg, [
      'name',
      'version',
      'private',
      'description',
      'author',
      'scripts',
      'main',
      'module',
      'browser',
      'jsDelivr',
      'unpkg',
      'files',
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'vue',
      'babel',
      'eslintConfig',
      'prettier',
      'postcss',
      'browserslist',
      'jest'
    ])
  }


}