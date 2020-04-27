const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const merge = require('deepmerge');
const { isBinaryFileSync } = require('isbinaryfile');
const resolve = require('resolve');
const { toShortPluginId, getPluginLink } = require('./pluginResolution');
const mergeDeps = require('./mergeDeps');

const isString = (val) => typeof val === 'string';
const isFunction = (val) => typeof val === 'function';
const isObject = (val) => val && typeof val === 'object';
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]));

const replaceBlockRE = /<%# REPLACE %>([^]*?)<%# END_REPLACE %>/g;

class GeneratorAPI {
  constructor (id, generator, options, rootOptions) {
    this.id = id;
    this.generator = generator;
    this.options = options;
    this.rootOptions = rootOptions;

    this.pluginsData = generator.plugins
      .filter(({ id }) => id !== `vin-cli-service`)
      .map(({ id }) => ({
        name: toShortPluginId(id),
        link: getPluginLink(id)
      }))
  }

  render(source, additionalData = {}) {
    const baseDir = extractCallDir();

    if (isString(source)) {
      source = path.resolve(baseDir, source);
      this._injectFileMiddleWare(async (files) => {
        const data = this._resolveData(additionalData);
        const globby = require('globby');
        const _files = await globby(['**/*'], { cwd: source });
        for (const rawPath of _files) {
          const targetPath = rawPath.split('/').map(filename => {
            // dotfiles are ignored when published to npm, therefore in templates
            // we need to use underscore instead (e.g. "_gitignore")
            if (filename.charAt(0) === '_' && filename.charAt(1) !== '_') {
              return `.${filename.slice(1)}`
            }
            if (filename.charAt(0) === '_' && filename.charAt(1) === '_') {
              return `${filename.slice(1)}`
            }
            return filename
          }).join('/')
          const sourcePath = path.resolve(source, rawPath)
          const content = renderFile(sourcePath, data)
          // only set file if it's not all whitespace, or is a Buffer (binary files)
          if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            files[targetPath] = content
          }
        }
      })
    } else if (isObject(source)) {
      this._injectFileMiddleWare(files => {
        const data = this._resolveData(additionalData);
        for (const targetPath in source) {
          const sourcePath = path.resolve(baseDir, source[targetPath]);
          const content = renderFile(sourcePath, data);
          if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            files[targetPath] = content
          }
        }
      })
    } else if (isFunction(source)) {
      this._injectFileMiddleWare(source);
    }

  }

  extendPackage(fields, forceNewVersion) {
    const pkg = this.generator.pkg
    const toMerge = isFunction(fields) ? fields(pkg) : fields
    for (const key in toMerge) {
      const value = toMerge[key]
      if (key === 'dependencies' || key === 'devDependencies') {
        let rawVal = pkg[key];
        pkg[key] = Object.assign({}, rawVal, value);
      } else {
        pkg[key] = value;
      }
    }
  }

  _injectFileMiddleWare(fn) {
    this.generator.fileMiddleWares.push(fn);
  }

  _resolveData(data) {
    return Object.assign({
      options: this.options,
      rootOptions: this.rootOptions,
      plugins: this.pluginsData
    }, data)
  }

}

function extractCallDir() {
  // extract api.render() callsite file location using error stack
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split('\n')[3]
  const fileName = callSite.match(/\s\((.*):\d+:\d+\)$/)[1]
  return path.dirname(fileName)
}

function renderFile(name, data) {
  if (isBinaryFileSync(name)) {
    return fs.readFileSync(name) // return buffer
  }
  const template = fs.readFileSync(name, 'utf-8')

  // custom template inheritance via yaml front matter.
  // ---
  // extend: 'source-file'
  // replace: !!js/regexp /some-regex/
  // OR
  // replace:
  //   - !!js/regexp /foo/
  //   - !!js/regexp /bar/
  // ---
  const yaml = require('yaml-front-matter')
  const parsed = yaml.loadFront(template)
  const content = parsed.__content
  let finalTemplate = content.trim() + `\n`

  if (parsed.when) {
    finalTemplate = (
      `<%_ if (${parsed.when}) { _%>` +
      finalTemplate +
      `<%_ } _%>`
    )

    // use ejs.render to test the conditional expression
    // if evaluated to falsy value, return early to avoid extra cost for extend expression
    const result = ejs.render(finalTemplate, data)
    if (!result) {
      return ''
    }
  }

  if (parsed.extend) {
    const extendPath = path.isAbsolute(parsed.extend)
      ? parsed.extend
      : resolve.sync(parsed.extend, { basedir: path.dirname(name) })
    finalTemplate = fs.readFileSync(extendPath, 'utf-8')
    if (parsed.replace) {
      if (Array.isArray(parsed.replace)) {
        const replaceMatch = content.match(replaceBlockRE)
        if (replaceMatch) {
          const replaces = replaceMatch.map(m => {
            return m.replace(replaceBlockRE, '$1').trim()
          })
          parsed.replace.forEach((r, i) => {
            finalTemplate = finalTemplate.replace(r, replaces[i])
          })
        }
      } else {
        finalTemplate = finalTemplate.replace(parsed.replace, content.trim())
      }
    }
  }

  return ejs.render(finalTemplate, data)
}

module.exports = GeneratorAPI;