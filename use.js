/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";



// #### System modules
var path = require('path')
var util = require('util')



// #### External modules
var _     = require('underscore')
var nid   = require('nid')
var norma = require('norma')
var error = require('eraro')({package:'use-plugin'})



// #### Exports
module.exports = make




// #### Create a new _use_ function
function make( options ) {

  //console.dir(options.module)

  options = _.extend({
    prefix:  'plugin-',
    builtin: '../plugin/',
    module:  module.parent
  },options)


  //console.log(util.inspect(module,{depth:null}))


  // This is the function that loads plugins.
  function use() {
    var args = norma("{plugin:o|f|s, options:o|s|n|b?, callback:f?}",arguments)

    var plugindesc = build_plugindesc(args)
    plugindesc.search = build_plugin_names( plugindesc.name, options.builtin, options.prefix )

    console.dir(plugindesc)


    if( !_.isFunction( plugindesc.init ) ) {
      loadplugin( plugindesc, options.module )      
    }

    if( !_.isFunction( plugindesc.init ) ) {
      throw error('not_found',plugindesc)
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
function build_plugindesc( spec ) {
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
      var prefix = _.isArray(options.prefix) ? options.prefix[0] : options.prefix
      plugindesc.name = prefix+nid()
    }

    plugindesc.init = plugin
  }
  else if( _.isObject( plugin ) ) {
    plugindesc = _.extend({},plugin,plugindesc)
    if( !_.isString(plugindesc.name) ) throw error('no_name',plugin);
    if( null != plugindesc.init && !_.isFunction(plugindesc.init) ) throw error('no_init_function',plugin);
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
    throw error('no_name',plugindesc)
  }

  return plugindesc
}



function loadplugin( plugindesc, start_module ) {

  var current_module = start_module
  var builtin        = true
  var level          = 0
  var reqfunc
  var funcdesc = {}

  while( null == funcdesc.initfunc && (reqfunc = make_reqfunc( current_module )) ) {
    funcdesc = perform_require( reqfunc, plugindesc.search, builtin, level )

    if( funcdesc.error ) handle_load_error(funcdesc.error,funcdesc.search, plugindesc);

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


function handle_load_error( err, search, plugindesc ) {
  plugindesc.err    = err
  plugindesc.search = search

  if( err instanceof SyntaxError ) {
    throw error('syntax_error',plugindesc)
  }
  else {
    throw error('load_failed',plugindesc)
  }
}


function make_reqfunc( module ) {
  if( null == module ) return null;
  //console.log('RF:'+module.id)
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
      //console.log('req '+level+' '+search.name)
      initfunc = reqfunc( search.name )
      break;
    }
    catch( e ) {
      if( e instanceof SyntaxError ) {
        return {error:e,search:search}
        //console.log(e.message)
        //console.log(e.fileName)
        //console.log(e.lineNumber)
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
