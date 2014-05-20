/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// mocha use.test.js


var util   = require('util')
var assert = require('assert')


var makeuse = require('..')


describe('use', function() {
  
  it('happy', function() {
    var use = makeuse()
    var p0 = use('p0')
    assert.equal('p0',p0.name)
    assert.equal('p0',p0.init())
  })

  it('clientlib0', function() {
    var client0 = require('./lib0/client0')
    var p0 = client0('p0')
    console.log(p0)
  })


  it('load', function() {
    var use = makeuse()

    // still loads p0.js! $a just => tag == 'a'
    var p0 = use('p0$a')
    assert.equal('p0',p0.name)
    assert.equal('a',p0.tag)
    assert.equal('p0',p0.init())
  })


  it('function', function() {
    var use = makeuse()

    var f0 = use( function(){ return 'f0' } )
    assert.ok( 0 == f0.name.indexOf('plugin-'))
    assert.equal( 'plugin-', f0.options.prefix )
    assert.ok( !f0.tag )
    assert.ok( !f0.callback )
    assert.equal('f0',f0.init())

    var f1 = use( function f1(){ return 'f1r' } )
    assert.equal( 'f1', f1.name )
    assert.equal( 'plugin-', f1.options.prefix )
    assert.ok( !f1.tag )
    assert.ok( !f1.callback )
    assert.equal('f1r',f1.init())    

    var f1tc = use( function f1$t0(){ return 'f1tcr' }, function(){return 'f1tck'} )
    assert.equal( 'f1', f1tc.name )
    assert.equal( 'plugin-', f1tc.options.prefix )
    assert.equal( 't0', f1tc.tag )
    assert.ok( 'function' == typeof(f1tc.callback) )
    assert.equal('f1tcr',f1tc.init())    
    assert.equal('f1tck',f1tc.callback())    


    var usep = makeuse({prefix:'s-'})

    var f2 = usep( function(){ return 'f2' } )
    assert.ok( 0 == f2.name.indexOf('s-'))
    assert.equal( 's-', f2.options.prefix )
    assert.ok( !f2.tag )
    assert.ok( !f2.callback )
    assert.equal('f2',f2.init())

    var f3 = usep( function f3(){ return 'f3r' } )
    assert.equal( 'f3', f3.name )
    assert.equal( 's-', f3.options.prefix )
    assert.ok( !f3.tag )
    assert.ok( !f3.callback )
    assert.equal('f3r',f3.init())    

    var f3tc = usep( function f3$t1(){ return 'f3tcr' }, function(){return 'f3tck'} )
    assert.equal( 'f3', f3tc.name )
    assert.equal( 's-', f3tc.options.prefix )
    assert.equal( 't1', f3tc.tag )
    assert.ok( 'function' == typeof(f3tc.callback) )
    assert.equal('f3tcr',f3tc.init())    
    assert.equal('f3tck',f3tc.callback())    
  })



  it('object', function() {
    var use = makeuse()

    try { use({}); assert.fail(); } catch( e ) { assert.equal('no_name',e.code) } 
    try { use({name:'not-a-plugin'}); assert.fail(); } catch( e ) { assert.equal('not_found',e.code) } 
    try { use({name:'a',init:1}); assert.fail(); } catch( e ) { assert.equal('no_init_function',e.code) } 

    var a = use({name:'a',init:function(){return 'ar'}})
    assert.equal('a',a.name)    
    assert.equal('ar',a.init())    

    var p0 = use({name:'p0'})
    assert.equal('p0',p0.name)
  })



  it('error', function() {
    var use = makeuse()

    try {
      use('not-a-plugin')
      assert.fail()
    }
    catch(e) {
      assert.equal(e.code,'not_found')
      assert.equal(e.message,'use-plugin: not_found')
      assert.equal(e.details.name,"not-a-plugin")
    }
  })


  
})

