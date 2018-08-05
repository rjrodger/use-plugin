/* Copyright (c) 2014-2018 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')

var Lab = require('lab')
var Code = require('code')

var Origin = require('./origin')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('use', function() {
  // NOTE: does not work if run using `lab -P test -g plugin-desc`
  // as module resolution fails
  it('happy', function(fin) {
    var p0 = Origin.use('p0')
    Assert.equal('p0', p0.name)
    Assert.equal('p0', p0.init())
    fin()
  })

  // Ensures Seneca.use('repl') works for seneca-repl
  it('prefix-repl', function(fin) {
    var usep = Origin.makeuse({ prefix: 'p-' })
    var repl = usep('repl')
    Assert.equal('repl', repl.name)
    Assert.equal('repl', repl.init())
    fin()
  })

  it('clientlib0', function(fin) {
    var client0 = require('./lib0/client0')
    var p0 = client0('p0')
    fin()
  })

  it('load', function(fin) {
    // still loads p0.js! $a just => tag == 'a'
    var p0 = Origin.use('p0$a')
    Assert.equal('p0', p0.name)
    Assert.equal('a', p0.tag)
    Assert.equal('p0', p0.init())
    fin()
  })

  it('function', function(fin) {
    var f0 = Origin.use(function() {
      return 'f0'
    })
    //console.log(f0)

    Assert.ok(0 == f0.name.indexOf('plugin-'))
    Assert.ok(!f0.tag)
    Assert.ok(!f0.callback)
    Assert.equal('f0', f0.init())

    var f1 = Origin.use(function f1() {
      return 'f1r'
    })
    Assert.equal('f1', f1.name)
    Assert.ok(!f1.tag)
    Assert.ok(!f1.callback)
    Assert.equal('f1r', f1.init())

    var f1tc = Origin.use(
      function f1$t0() {
        return 'f1tcr'
      },
      function() {
        return 'f1tck'
      }
    )
    Assert.equal('f1', f1tc.name)
    Assert.equal('t0', f1tc.tag)
    Assert.ok('function' == typeof f1tc.callback)
    Assert.equal('f1tcr', f1tc.init())
    Assert.equal('f1tck', f1tc.callback())

    var usep = Origin.makeuse({ prefix: 's-' })

    var f2 = usep(function() {
      return 'f2'
    })
    Assert.ok(0 == f2.name.indexOf('s-'))
    Assert.ok(!f2.tag)
    Assert.ok(!f2.callback)
    Assert.equal('f2', f2.init())

    var f3 = usep(function f3() {
      return 'f3r'
    })
    Assert.equal('f3', f3.name)
    Assert.ok(!f3.tag)
    Assert.ok(!f3.callback)
    Assert.equal('f3r', f3.init())

    var f3tc = usep(
      function f3$t1() {
        return 'f3tcr'
      },
      function() {
        return 'f3tck'
      }
    )
    Assert.equal('f3', f3tc.name)
    Assert.equal('t1', f3tc.tag)
    Assert.ok('function' == typeof f3tc.callback)
    Assert.equal('f3tcr', f3tc.init())
    Assert.equal('f3tck', f3tc.callback())

    fin()
  })

  it('function-options', function(fin) {
    var f1 = Origin.use(function f1() {}, { a: 1 })
    Assert.equal(f1.options.a, 1)
    fin()
  })

  it('object', function(fin) {
    var use = Origin.use

    try {
      use({ foo: 1 })
      Assert.fail()
    } catch (e) {
      Assert.equal('no_name', e.code)
      Assert.equal(
        'use-plugin: No name property found for plugin defined by Object { foo: 1 }.',
        e.message
      )
    }

    try {
      use({ name: 'a', init: 1 })
      Assert.fail()
    } catch (e) {
      Assert.equal('no_init_function', e.code)
      Assert.equal(
        "use-plugin: The init property is not a function for plugin a defined by Object { name: 'a', init: 1 }.",
        e.message
      )
    }

    try {
      use({ name: 'not-a-plugin' })
      Assert.fail()
    } catch (e) {
      Assert.equal('not_found', e.code)
      Assert.equal(
        'use-plugin: Could not load plugin not-a-plugin; require search list: ../plugin/not-a-plugin, ../plugin/plugin-not-a-plugin, not-a-plugin, plugin-not-a-plugin, ./not-a-plugin, ./plugin-not-a-plugin.',
        e.message
      )
    }

    var a = use({
      name: 'a',
      init: function() {
        return 'ar'
      }
    })
    Assert.equal('a', a.name)
    Assert.equal('ar', a.init())

    var p0 = use({ name: 'p0' })
    Assert.equal('p0', p0.name)

    fin()
  })

  it('error', function(fin) {
    var use = Origin.use

    try {
      use('not-a-plugin')
      Assert.fail()
    } catch (e) {
      Assert.equal(e.code, 'not_found')
      Assert.equal(
        e.message,
        'use-plugin: Could not load plugin not-a-plugin; require search list: ../plugin/not-a-plugin, ../plugin/plugin-not-a-plugin, not-a-plugin, plugin-not-a-plugin, ./not-a-plugin, ./plugin-not-a-plugin.'
      )
      Assert.equal(e.details.name, 'not-a-plugin')

      fin()
    }
  })

  // NOTE: does not work if run using `lab -P test -g plugin-desc`
  // as module resolution fails
  it('basic-defaults', function(fin) {
    var p1 = Origin.use('p1', { b: 2 })

    expect(p1.name).equal('p1n')
    expect(p1.init()).equal('p1x')
    expect(p1.defaults).equal({ a: 1 })
    expect(p1.options).equal({ a: 1, b: 2 })

    fin()
  })

  it('option-fail', function(fin) {
    try {
      Origin.use(
        {
          name: 'p2',
          init: function() {},
          defaults: {
            a: Origin.use.Joi.string()
          }
        },
        { a: 1 }
      )
    } catch (e) {
      expect(e.message).equals('child "a" fails because ["a" must be a string]')
      fin()
    }
  })

  it('frozen-options', function(fin) {
    var f1 = Origin.use(function f1() {}, Object.freeze({ a: 1 }))
    Assert.equal(f1.options.a, 1)
    fin()
  })

  it('intern-make_system_modules', function(fin) {
    Assert(Origin.makeuse.intern.make_system_modules().length > 0)
    fin()
  })
})
