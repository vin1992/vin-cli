const execa = require('execa');
const SUPPORT_PACKAGEMANAGER = ['yarn', 'npm'];
const { hasYarn } = require('./env');

const PACKAGE_MANAGER_CONFIG = {
  npm: {
    install: ['install', '--loglevel', 'error'],
    add: ['install', '--loglevel', 'error'],
    upgrade: ['update', '--loglevel', 'error'],
    remove: ['uninstall', '--loglevel', 'error']
  },
  yarn: {
    install: [],
    add: ['add'],
    upgrade: ['upgrade'],
    remove: ['remove']
  }
}

module.exports = class PackageManager {
  constructor ({ ctx, forcePackageManager } = {}) {
    this.context = ctx;
    if (forcePackageManager) {
      this.bin = forcePackageManager;
    } else {
      this.bin = hasYarn() ? 'yarn' : 'npm'
    }

    if (!SUPPORT_PACKAGEMANAGER.includes(this.bin)) {
      throw new Error(`${this.bin}: 未知的包管理工具`)
    }
  }

  async getRegistry() {
    if (this._registry) {
      return this._registry;
    }

    const { stdout } = await execa(this.bin, ['config', 'get', 'registry']);
    return stdout;

  }

  async addRegistryToArgs(args) {
    const registry = await this.getRegistry();
    args.push(`--registry=${registry}`);

    return args;
  }

  async install() {
    let _args = PACKAGE_MANAGER_CONFIG[this.bin].install;
    const args = await this.addRegistryToArgs(_args);

    return new Promise((resolve, reject) => {
      const child = execa(this.bin, args, {
        cwd: this.context,
        stdio: ['inherit', 'inherit', this.bin === 'yarn' ? 'pipe' : 'inherit']
      });

      child.on('close', code => {
        if (code !== 0) {
          reject(`执行 安装命令 失败：${this.bin} - ${args.join(' ')}`)
        } else {
          resolve();
        }
      })

    })

  }

}