/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";



// #### System modules
var path = require('path')
var util = require('util')



// #### External modules
var _          = require('underscore')
var nid        = require('nid')
var norma      = require('norma')
var make_eraro = require('eraro')




// #### Exports
module.exports = make



// #### Create a new _use_ function
function make( useopts ) {

  useopts = _.extend({
    prefix:    'plugin-',
    builtin:   '../plugin/',
    module:    module.parent,
    msgprefix: true
  },useopts)


  var eraro = make_eraro({package:'use-plugin',msgmap:msgmap(),module:module,prefix:useopts.msgprefix})
  

  // This is the function that loads plugins.
  function use() {
    var args = norma("{plugin:o|f|s, options:o|s|n|b?, callback:f?}",arguments)

    var plugindesc = build_plugindesc(args,useopts,eraro)
    plugindesc.search = build_plugin_names( plugindesc.name, useopts.builtin, useopts.prefix )

    if( !_.isFunction( plugindesc.init ) ) {
      loadplugin( plugindesc, useopts.module, eraro )      
    }

    if( !_.isFunction( plugindesc.init ) ) {
      throw eraro('not_found',plugindesc)
    }

    return plugindesc
  }
  
  return use;
}



// #### Create description object for the plugin using the supplied arguments
// Plugin can be one of:
//
//   * _string_: require as a module over an extended range of _require_ calls
//   * _function_: provide the initialization function directly
//   * _object_: provide a custom plugin description
function build_plugindesc( spec, useopts, eraro ) {
  var plugin = spec.plugin

  var options = null == spec.options ? {} : spec.options
  options = _.isObject(options) ? options : {value$:options}


  var plugindesc = {
    options:  options,
    callback: spec.callback
  }


  if( _.isString( plugin ) ) {
    plugindesc.name = plugin
  }

  else if( _.isFunction( plugin ) ) {
    if( _.isString(plugin.name) && '' !== plugin.name ) {
      plugindesc.name = plugin.name
    }
    else {
      var prefix = _.isArray(useopts.prefix) ? useopts.prefix[0] : useopts.prefix
      plugindesc.name = prefix+nid()
    }

    plugindesc.init = plugin
  }

  else if( _.isObject( plugin ) ) {
    plugindesc = _.extend({},plugin,plugindesc)

    if( !_.isString(plugindesc.name) ) throw eraro('no_name',{plugin:plugin});

    if( null != plugindesc.init && !_.isFunction(plugindesc.init) ) {
      throw eraro('no_init_function',{name:plugindesc.name,plugin:plugin});
    }
  }
  
  plugindesc.options = _.extend(plugindesc.options||{},options||{})


  // Plugins can be tagged.
  // The tag can be embedded inside the name using a $ separator: _name$tag_.
  // Note: the $tag suffix is NOT considered part of the file name!
  var m = /^(.+)\$(.+)$/.exec(plugindesc.name)
  if( m ) {
    plugindesc.name = m[1]
    plugindesc.tag  = m[2]
  }


  if( !plugindesc.name ) {
    throw eraro('no_name',plugindesc)
  }

  return plugindesc
}



function loadplugin( plugindesc, start_module, eraro ) {

  var current_module = start_module
  var builtin        = true
  var level          = 0
  var reqfunc
  var funcdesc = {}

  while( null == funcdesc.initfunc && (reqfunc = make_reqfunc( current_module )) ) {
    funcdesc = perform_require( reqfunc, plugindesc.search, builtin, level )

    if( funcdesc.error ) handle_load_error(funcdesc.error,funcdesc.found,plugindesc,eraro);

    builtin = false
    level++
    current_module = current_module.parent
  }

  plugindesc.modulepath  = funcdesc.module
  plugindesc.requirepath = funcdesc.require

  if( funcdesc.initfunc && null != funcdesc.initfunc.name && '' != funcdesc.initfunc.name ) {
    plugindesc.name = funcdesc.initfunc.name
  }

  plugindesc.init = funcdesc.initfunc
}



function handle_load_error( err, found, plugindesc, eraro ) {
  plugindesc.err   = err
  plugindesc.found = found

  if( err instanceof SyntaxError ) {
    throw eraro('syntax_error',plugindesc)
  }
  else if( 'MODULE_NOT_FOUND' == err.code) {
    throw eraro('plugin_require_failed',plugindesc)
  }
  else {
    throw eraro('load_failed',plugindesc)
  }
}



function make_reqfunc( module ) {
  if( null == module ) return null;

  var reqfunc = _.bind(module.require,module)
  reqfunc.module = module.id
  return reqfunc
}



function perform_require( reqfunc, search_list, builtin, level ) {
  var initfunc, search

  for( var i = 0; i < search_list.length; i++ ) {
    search = search_list[i]
    if( !builtin && 'builtin'==search.type ) continue;

    try {
      initfunc = reqfunc( search.name )

      // found it! 
      break;
    }
    catch( e ) {
      if( 'MODULE_NOT_FOUND' == e.code ) {
        // require failed inside plugin
        if( -1 == e.message.indexOf(search.name) ) {
          return {error:e,found:search}
        }
        // else plain old not found, so continue searching
      }

      else {
        return {error:e,found:search}
      }
    }
  }
  
  return {initfunc:initfunc,module:reqfunc.module,require:search.name}
}




function build_plugin_names() {
  var args = norma('{name:s, builtin:s|a?, prefix:s|a? }', arguments)

  var name         = args.name
  var builtin_list = args.builtin ? _.isArray(args.builtin) ? args.builtin : [args.builtin] : []
  var prefix_list  = args.prefix  ? _.isArray(args.prefix)  ? args.prefix :  [args.prefix] : []
 
  var plugin_names = []

  _.each( builtin_list, function(builtin){
    plugin_names.push( {type:'builtin', name:builtin+name} )
    _.each( prefix_list, function(prefix){
      plugin_names.push( {type:'builtin', name:builtin+prefix+name} )
    })
  })
  
  plugin_names.push( {type:'normal', name:name} )

  _.each( prefix_list, function(prefix){
    plugin_names.push( {type:'normal', name:prefix+name} )
  })

  plugin_names.push( {type:'normal', name:'./'+name} )

  _.each( prefix_list, function(prefix){
    plugin_names.push( {type:'normal', name:'./'+prefix+name} )
  })

  return plugin_names
}


function msgmap() {
  return {
    syntax_error: "Could not load plugin <%=name%> defined in <%=found.name%> due to syntax error: <%=err.message%>. See STDERR for details.",
    not_found: "Could not load plugin <%=name%>; require search list: <%=_.map(search,function(s){return s.name}).join(', ')%>.",
    plugin_require_failed: "Could not load plugin <%=name%> defined in <%=found.name%> as a require call inside the plugin failed: <%=err.message%>.",
    no_name: "No name property found for plugin defined by Object <%=util.inspect(plugin)%>.",
    no_init_function: "The init property is not a function for plugin <%=name%> defined by Object <%=util.inspect(plugin)%>.",
    load_failed: "Could not load plugin <%=name%> defined in <%=found.name%> due to error: <%=err.message%>.",
  }
}
