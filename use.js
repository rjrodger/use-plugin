/* Copyright © 2014-2024 Richard Rodger and other contributors, MIT License. */
'use strict'

const Path = require('path')
const Module = require('module')

// Generic plugin loader functionality for Node.js frameworks.

// #### External modules
const Nid = require('nid')
const Gubu = require('gubu')
const Eraro = require('eraro')
const DefaultsDeep = require('lodash.defaultsdeep')

const { MakeArgu, Skip, One, Empty } = Gubu

const Argu = MakeArgu('use')

// '{plugin:o|f|s, options:o|s|n|b?, callback:f?}',

const PluginArgu = Argu('plugin', {
  plugin: One(Object, Function, String),
  options: Skip(One(Object, String)),
  callback: Skip(One(Function, null)),
})

// #### Exports
module.exports = make
// module.exports.Joi = Optioner.Joi
// module.exports.Optioner = Optioner

// #### Create a _use_ function
// Parameters:
//
//   * _useopts_ : (optional) Object; options, which are:
//      * _prefix_ : (optional) String or Array[String]; prepended to plugin names when searching, allows abbreviation of plugin names
//      * _builtin_ : (optional) String or Array[String]; prepend to plugin names when searching, only applies to base module, used for frameworks with builtin plugins
//      * _module_ : (optional, defaults to parent) Object; Node.js API module object, this should be the module of the framework, search will ascend from this module via the parent property
//      * _errmsgprefix_ : (optional, default: true) String or Boolean; error message prefix for [eraro](http://github.com/rjrodger/eraro) module, used by this module to generate error messages
function make(useopts) {
  // Default options, overidden by caller supplied options.
  useopts = Object.assign(
    {
      prefix: 'plugin-',
      builtin: '../plugin/',
      module: module.parent,
      errmsgprefix: true,
      system_modules: intern.make_system_modules(),
      merge_defaults: true,
      gubu: true,
    },
    useopts,
  )

  // Setup error messages, see msgmap function below for text.
  const eraro = Eraro({
    package: 'use-plugin',
    msgmap: msgmap(),
    module: module,
    prefix: useopts.errmsgprefix,
  })

  // This is the function that loads plugins.
  // It is returned for use by the framework calling code.
  // Parameters:
  //
  //   * _plugin_ : (Object or Function or String); plugin definition
  //      * if Object: provide a partial or complete definition with same properties as return value
  //      * if Function: assumed to be plugin _init_ function; plugin name taken from function name, if defined
  //      * if String: base for _require_ search; assumes module defines an _init_ function
  //   * _options_ : (Object, ...); plugin options, if not an object, constructs an object of form {value$:options}
  //   * _callback_ : (Function); callback function, possibly to be called by framework after init function completes
  //
  // Returns: A plugin description object is returned, with properties:
  //
  //   * _name_ : String; the plugin name, either supplied by calling code, or derived from definition
  //   * _init_  : Function; the plugin init function, the resolution of which is the point of this module!
  //   * _options_ : Object; plugin options, if supplied
  //   * _search_ : Array[{type,name}]; list of require search paths; applied to each module up the parent chain until something is found
  //   * _found_ : Object{type,name}; search entry that found something
  //   * _requirepath_ : String; the argument to require that found something
  //   * _modulepath_ : String; the Node.js API module.id whose require found something
  //   * _tag_ : String; the tag value of the plugin name (format: name$tag), if any, allows loading of same plugin multiple times
  //   * _err_ : Error; plugin load error, if any
  function use() {
    try {
      const args = PluginArgu(arguments)

      return use_plugin_desc(
        build_plugin_desc(args, useopts, eraro),
        useopts,
        eraro,
      )
    } catch (err) {
      if ('shape' === err.code) {
        err.code = 'invalid_arguments'
      }
      throw err
    }
  }

  // use.Optioner = Optioner
  // use.Joi = Optioner.Joi

  use.use_plugin_desc = function (plugin_desc) {
    return use_plugin_desc(plugin_desc, useopts, eraro)
  }

  use.build_plugin_desc = function () {
    try {
      const args = PluginArgu(arguments)
      return build_plugin_desc(args, useopts, eraro)
    } catch (err) {
      if ('shape' === err.code) {
        err.code = 'invalid_arguments'
      }
      throw err
    }
  }

  return use
}

function use_plugin_desc(plugin_desc, useopts, eraro) {
  plugin_desc.search = build_plugin_names(
    plugin_desc.name,
    useopts.builtin,
    useopts.prefix,
    useopts.system_modules,
  )

  // The init function may already be defined.
  // If it isn't, try to load it using _require_ over
  // the search paths and module ancestry.
  if ('function' !== typeof plugin_desc.init) {
    load_plugin(plugin_desc, useopts.module, eraro)
  }

  let defaults = null

  if (
    plugin_desc.init &&
    plugin_desc.init.defaults &&
    // (Joi.isSchema(plugin_desc.init.defaults, { legacy: true }) ||
    // TODO: use Gubu.isShape
    ((plugin_desc.init.defaults.gubu && plugin_desc.init.defaults.gubu.gubu$) ||
      'function' === typeof plugin_desc.init.defaults)
  ) {
    defaults = plugin_desc.init.defaults
  } else if (
    (plugin_desc.defaults &&
      // (Joi.isSchema(plugin_desc.defaults, { legacy: true }) ||
      // TODO: use Gubu.isShape
      plugin_desc.defaults.gubu &&
      plugin_desc.defaults.gubu.gubu$) ||
    'function' === typeof plugin_desc.defaults
  ) {
    defaults = plugin_desc.defaults
  } else {
    defaults = Object.assign(
      {},
      plugin_desc.defaults,
      plugin_desc.init && plugin_desc.init.defaults,
    )
  }

  plugin_desc.defaults = defaults

  if (useopts.merge_defaults && 'object' === typeof defaults) {
    plugin_desc.options = DefaultsDeep({}, plugin_desc.options, defaults)

    // try {
    //   // plugin_desc.options = Optioner(defaults, { allow_unknown: true }).check(
    //   //   plugin_desc.options
    //   // )
    // } catch (e) {
    //   throw eraro('invalid_option', {
    //     name: plugin_desc.name,
    //     err_msg: e.message,
    //     options: plugin_desc.options,
    //   })
    // }
  }

  // No init function found, require found nothing, so throw error.
  if ('function' !== typeof plugin_desc.init) {
    if (null == plugin_desc.found) {
      const foldermap = {}

      for (let i = 0; i < plugin_desc.history.length; i++) {
        const item = plugin_desc.history[i]
        const folder = Path.dirname(item.module)
        foldermap[folder] = foldermap[folder] || []
        foldermap[folder].push(item.path)
      }

      const b = []
      Object.keys(foldermap).forEach(function (folder) {
        b.push('\n' + Path.resolve(folder) + ':')
        foldermap[folder].forEach(function (path) {
          b.push('\n  ' + path)
        })
        b.push('\n')
      })

      plugin_desc.searchlist = b.join('')

      throw eraro('not_found', plugin_desc)
    } else {
      throw eraro('invalid_definition', plugin_desc)
    }
  }

  return plugin_desc
}

// #### Create description object for the plugin
function build_plugin_desc(spec, useopts, eraro) {
  const plugin = spec.plugin

  // Don't do much with plugin options, just ensure they are an object.
  let options =
    null == spec.options
      ? null == plugin.options
        ? {}
        : plugin.options
      : spec.options
  options = 'object' === typeof options ? options : { value$: options }

  // Start building the return value.
  let plugin_desc = {
    options: options,
    callback: spec.callback,
    history: [],
  }

  // The most common case, where the plugin is
  // specified as a string name to be required in.
  if ('string' === typeof plugin) {
    plugin_desc.name = plugin
  }

  // Define the plugin with a function, most often used for small,
  // on-the-fly plugins.
  else if ('function' === typeof plugin) {
    if ('' !== plugin.name) {
      plugin_desc.name = plugin.name
    }

    // The function has no name, so generate a name for the plugin
    else {
      const prefix = Array.isArray(useopts.prefix)
        ? useopts.prefix[0]
        : useopts.prefix
      plugin_desc.name = prefix + Nid()
    }

    plugin_desc.init = plugin
  }

  // Provide some or all of plugin definition directly.
  else if ('object' === typeof plugin) {
    plugin_desc = Object.assign({}, plugin, plugin_desc)

    let name = plugin_desc.name
    if ('string' !== typeof name) {
      name = null != plugin_desc.init ? plugin_desc.init.name : null
    }

    if (null == name) {
      throw eraro('no_name', { plugin: plugin })
    } else {
      plugin_desc.name = name
    }

    if (null != plugin_desc.init && 'function' !== typeof plugin_desc.init) {
      throw eraro('no_init_function', {
        name: name,
        plugin: plugin,
      })
    }
  }

  // Options as an argument to the _use_ function override options
  // in the plugin description object.
  plugin_desc.options = Object.assign(
    {},
    plugin_desc.options || {},
    options || {},
  )

  // Plugins can be tagged.
  // The tag can be embedded inside the name using a $ separator: _name$tag_.
  // Note: the $tag suffix is NOT considered part of the file name!

  const m = /^(.+)\$(.+)$/.exec(plugin_desc.name)
  if (m) {
    plugin_desc.name = m[1]
    plugin_desc.tag = m[2]
  }

  plugin_desc.full =
    plugin_desc.name +
    (null == plugin_desc.tag || '' == plugin_desc.tag
      ? ''
      : '$' + plugin_desc.tag)

  // Plugins must have a name.
  if (!plugin_desc.name) {
    throw eraro('no_name', plugin_desc)
  }

  return plugin_desc
}

// #### Attempt to load the plugin
// The following algorithm is used:
//     0. WHILE module defined
//     1.   FOR EACH search-entry
//     2.     IF NOT first module IGNORE builtins
//     3.     PERFORM require ON search-entry.name
//     4.     IF FOUND BREAK
//     5.     IF ERROR THROW # construct contextual info
//     6.   IF FOUND update plugin_desc, BREAK
//     7.   IF NOT FOUND module = module.parent
function load_plugin(plugin_desc, start_module, eraro) {
  let current_module = start_module
  let builtin = true
  let level = 0
  let funcdesc = {}
  let reqfunc

  // Each loop ascends the module.parent hierarchy
  while (
    null == funcdesc.initfunc &&
    (reqfunc = make_reqfunc(current_module))
  ) {
    funcdesc = perform_require(reqfunc, plugin_desc, builtin, level)

    if (funcdesc.error) {
      throw handle_load_error(
        funcdesc.error,
        funcdesc.found,
        plugin_desc,
        eraro,
      )
    }

    builtin = false
    level++
    current_module = current_module.parent
  }

  // Record the details of where we found the plugin.
  // This is useful for debugging, especially if the "wrong" plugin is loaded.
  plugin_desc.modulepath = funcdesc.module
  plugin_desc.requirepath = funcdesc.require
  plugin_desc.found = funcdesc.found

  // Handle TypeScript default export shenanigans
  if (
    null != funcdesc.initfunc &&
    'object' === typeof funcdesc.initfunc &&
    'function' === typeof funcdesc.initfunc.default
  ) {
    funcdesc.initfunc = funcdesc.initfunc.default
  }

  // The function name of the initfunc, if defined,
  // sets the final name of the plugin.
  // This replaces relative path references (like "../myplugins/foo")
  // with a clean name ("foo").
  if (
    funcdesc.initfunc &&
    null != funcdesc.initfunc.name &&
    '' !== funcdesc.initfunc.name
  ) {
    plugin_desc.name = funcdesc.initfunc.name
  }

  plugin_desc.init = funcdesc.initfunc

  // Init function can also provide options
  if (plugin_desc.init && 'object' === typeof plugin_desc.init.defaults) {
    plugin_desc.defaults = Object.assign({}, plugin_desc.init.defaults)
  }
}

// #### The require that loads a plugin can fail
// This code deals with the known failure cases.
function handle_load_error(err, found, plugin_desc, eraro) {
  plugin_desc.err = err
  plugin_desc.found = found

  plugin_desc.found_name = plugin_desc.found.name
  plugin_desc.err_msg = err.message

  // Syntax error inside the plugin code.
  // Unfortunately V8 does not give us location info.
  // It does print a complaint to STDERR, so need to tell user to look there.
  if (err instanceof SyntaxError) {
    return eraro('syntax_error', plugin_desc)
  }

  // Not what you think!
  // This covers the case where the plugin contains
  // _require_ calls that themselves fail.
  else if ('MODULE_NOT_FOUND' == err.code) {
    plugin_desc.err_msg = err.stack.replace(/\n.*\(module\.js:.*/g, '')
    plugin_desc.err_msg = plugin_desc.err_msg.replace(/\s+/g, ' ')
    return eraro('require_failed', plugin_desc)
  }

  // The require call failed for some other reason.
  else {
    return eraro('load_failed', plugin_desc)
  }
}

// #### Create a _require_ call bound to the correct module
function make_reqfunc(module) {
  if (null == module) return null

  const reqfunc = module.require.bind(module)
  reqfunc.module = module.id

  return reqfunc
}

// #### Iterate over all the search items using the provided require function
function perform_require(reqfunc, plugin_desc, builtin, level) {
  const search_list = plugin_desc.search
  let initfunc
  let search
  let found

  next_search_entry: for (let i = 0; i < search_list.length; i++) {
    search = search_list[i]

    // only load builtins if builtin flag true
    if (!builtin && 'builtin' == search.type) continue

    if (0 === level && 'builtin' != search.type && search.name.match(/^[./]/))
      continue

    try {
      // NOTE: Unfortunately module.require does not expose require.resolve
      if (reqfunc.resolve) {
        search.path = reqfunc.resolve(search.name)
      } else {
        search.path = search.path || search.name
      }

      const history_entry = {
        module: reqfunc.module,
        path: search.path,
        name: search.name,
      }
      plugin_desc.history.push(history_entry)

      initfunc = reqfunc(search.name)

      found = search

      // Found it!
      break
    } catch (e) {
      if ('MODULE_NOT_FOUND' == e.code) {
        // TODO: this fails if a sub file of the plugin module fails,
        // as the module name is within the file path
        // E.g. seneca-entity/lib/common.js

        // A require failed inside the plugin.
        if (-1 == e.message.indexOf(search.name)) {
          return { error: e, found: search }
        }

        // Plain old not found, so continue searching.
        continue next_search_entry
      } else {
        // The require failed for some other reason.
        return { error: e, found: search }
      }
    }
  }

  // Return the init function, and a description of where we found it.
  return {
    initfunc: initfunc,
    module: reqfunc.module,
    require: search.name,
    path: search.path,
    // found: search,
    found,
  }
}

const BuildNameArgu = Argu('build-name', {
  name: String,
  builtin: Skip(One(Empty(String), Array)),
  prefix: Skip(One(Empty(String), Array)),
  system: Skip(Array),
})

// #### Create the list of require search locations
// Searches are performed without the prefix first
function build_plugin_names() {
  const args = BuildNameArgu(arguments)

  const name = args.name
  const isRelative = name.match(/^[./]/)

  const builtin_list = args.builtin
    ? Array.isArray(args.builtin)
      ? args.builtin
      : [args.builtin]
    : []

  const prefix_list = args.prefix
    ? Array.isArray(args.prefix)
      ? args.prefix
      : [args.prefix]
    : []

  const system_modules = args.system || []

  const plugin_names = []

  // Do the builtins first! But only for the framework module, see above.
  if (!isRelative) {
    builtin_list.forEach(function (builtin) {
      plugin_names.push({ type: 'builtin', name: builtin + name })
      prefix_list.forEach(function (prefix) {
        plugin_names.push({ type: 'builtin', name: builtin + prefix + name })
      })
    })

    // Try the prefix first - this ensures something like seneca-joi works
    // where there is also a joi module

    prefix_list.forEach(function (prefix) {
      plugin_names.push({ type: 'normal', name: prefix + name })
    })
  }

  // Vanilla require on the plugin name.
  // Common case: the require succeeds on first module parent,
  // because the plugin is an npm module
  // in the code calling the framework.
  // You can't load node system modules as plugins, however.
  if (-1 == system_modules.indexOf(name)) {
    plugin_names.push({ type: 'normal', name: name })
  }

  if (!isRelative) {
    // OK, probably not an npm module, try locally.
    plugin_names.push({ type: 'normal', name: './' + name })

    prefix_list.forEach(function (prefix) {
      plugin_names.push({ type: 'normal', name: './' + prefix + name })
    })
  }

  const orig_plugin_names = plugin_names.slice(0)
  orig_plugin_names.forEach((n) => {
    if (n.name.match(/[a-z][A-Z]/)) {
      plugin_names.push({
        ...n,
        name: n.name
          .replace(
            /([a-z])([A-Z])/g,
            (m, p1, p2) => p1 + '-' + p2.toLowerCase(),
          )
          .replace(/([A-Z])/g, (m, p1) => p1.toLowerCase()),
      })
    } else if (n.name.match(/[a-z]-[a-z]/)) {
      plugin_names.push({
        ...n,
        name: n.name
          .replace(/([a-z])-([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase())
          .replace(/([^\w])([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase())
          .replace(/^([a-z])/g, (m, p1) => p1.toUpperCase()),
      })
    }
  })

  // console.log('PLUGIN_NAMES', plugin_names)

  return plugin_names
}

// #### Define the error messages for this module
function msgmap() {
  return {
    syntax_error:
      'Could not load plugin <%=name%> defined in <%=found_name%> due to syntax error: <%=err_msg%>. See STDERR for details.',
    not_found:
      'Could not load plugin <%=name%>; searched the following folder and file paths: <%=searchlist%>.',
    require_failed:
      'Could not load plugin <%=name%> defined in <%=found_name%> as a require call inside the plugin (or a module required by the plugin) failed: <%=err_msg%>.',
    no_name: 'No name property found for plugin defined by Object <%=plugin%>.',
    no_init_function:
      'The init property is not a function for plugin <%=name%> defined by Object <%=plugin%>.',
    load_failed:
      'Could not load plugin <%=name%> defined in <%=found_name%> due to error: <%=err_msg%>.',
    invalid_option:
      'Plugin <%=name%>: option value is not valid: <%=err_msg%> in options <%=options%>',
    invalid_definition: 'Plugin <%=name%>: no definition function found.',
  }
}

const intern = (module.exports.intern = {
  make_system_modules: function () {
    return Module.builtinModules
  },
})
