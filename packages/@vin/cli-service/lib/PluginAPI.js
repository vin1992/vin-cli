const path = require('path')
const hash = require('hash-sum')
const semver = require('semver')

class PluginAPI {
  constructor (id, service) {
    this.id = id;
    this.service = service;
  }

  registerCommand(name, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = null
    }
    this.service.commands[name] = { fn, opts: opts || {} }
  }

  resolveWebpackConfig(chainableConfig) {
    return this.service.resolveWebpackConfig(chainableConfig)
  }

  resolveChainableWebpackConfig() {
    return this.service.resolveChainableWebpackConfig()
  }

  chainWebpack(fn) {
    this.service.webpackChainFns.push(fn)
  }

  resolve(_path) {
    return path.resolve(this.service.context, _path)
  }

  genCacheConfig(id, partialIdentifier, configFiles = []) {
    const fs = require('fs')
    const cacheDirectory = this.resolve(`node_modules/.cache/${id}`)

    // replace \r\n to \n generate consistent hash
    const fmtFunc = conf => {
      if (typeof conf === 'function') {
        return conf.toString().replace(/\r\n?/g, '\n')
      }
      return conf
    }

    const variables = {
      partialIdentifier,
      'cli-service': require('../package.json').version,
      'cache-loader': require('cache-loader/package.json').version,
      env: process.env.NODE_ENV,
      test: !!process.env.VUE_CLI_TEST,
      config: [
        fmtFunc(this.service.projectOptions.chainWebpack),
        fmtFunc(this.service.projectOptions.configureWebpack)
      ]
    }

    if (!Array.isArray(configFiles)) {
      configFiles = [configFiles]
    }
    configFiles = configFiles.concat([
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ])

    const readConfig = file => {
      const absolutePath = this.resolve(file)
      if (!fs.existsSync(absolutePath)) {
        return
      }

      if (absolutePath.endsWith('.js')) {
        // should evaluate config scripts to reflect environment variable changes
        try {
          return JSON.stringify(require(absolutePath))
        } catch (e) {
          return fs.readFileSync(absolutePath, 'utf-8')
        }
      } else {
        return fs.readFileSync(absolutePath, 'utf-8')
      }
    }

    for (const file of configFiles) {
      const content = readConfig(file)
      if (content) {
        variables.configFiles = content.replace(/\r\n?/g, '\n')
        break
      }
    }

    const cacheIdentifier = hash(variables)
    return { cacheDirectory, cacheIdentifier }
  }
}

module.exports = PluginAPI;