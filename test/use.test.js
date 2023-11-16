/* Copyright (c) 2014-2022 Richard Rodger, MIT License */
'use strict'

const Util = require('util')
const Assert = require('assert')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const Origin = require('./origin')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const it = make_it(lab)
const expect = Code.expect

const { Gubu } = require('gubu')

describe('use', function () {
  // NOTE: does not work if run using `lab -P test -g plugin-desc`
  // as module resolution fails
  it('happy', function (fin) {
    var p0 = Origin.use('p0')
    Assert.equal('p0', p0.name)
    Assert.equal('p0', p0.init())
    fin()
  })

  // Ensures Seneca.use('repl') works for seneca-repl
  it('prefix-repl', function (fin) {
    var usep = Origin.makeuse({ prefix: 'p-' })
    var repl = usep('repl')
    Assert.equal('repl', repl.name)
    Assert.equal('repl', repl.init())
    fin()
  })

  it('prefix-edges', function (fin) {
    var usep = Origin.makeuse({ prefix: 'a-' })
    expect(usep(function () {}).name).startsWith('a-')

    usep = Origin.makeuse({ prefix: ['aa-', 'bb-'] })
    expect(usep(function () {}).name).startsWith('aa-')

    fin()
  })

  it('clientlib0', function (fin) {
    var client0 = require('./lib0/client0')
    var p0 = client0('p0')
    fin()
  })

  it('load', function (fin) {
    // still loads p0.js! $a just => tag == 'a'
    var p0 = Origin.use('p0$a')
    Assert.equal('p0', p0.name)
    Assert.equal('a', p0.tag)
    Assert.equal('p0', p0.init())
    fin()
  })

  it('function', function (fin) {
    var f0 = Origin.use(function () {
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
      function () {
        return 'f1tck'
      },
    )
    Assert.equal('f1', f1tc.name)
    Assert.equal('t0', f1tc.tag)
    Assert.ok('function' == typeof f1tc.callback)
    Assert.equal('f1tcr', f1tc.init())
    Assert.equal('f1tck', f1tc.callback())

    var usep = Origin.makeuse({ prefix: 's-' })

    var f2 = usep(function () {
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
      function () {
        return 'f3tck'
      },
    )
    Assert.equal('f3', f3tc.name)
    Assert.equal('t1', f3tc.tag)
    Assert.equal('f3$t1', f3tc.full)
    Assert.ok('function' == typeof f3tc.callback)
    Assert.equal('f3tcr', f3tc.init())
    Assert.equal('f3tck', f3tc.callback())

    fin()
  })

  it('function-options', function (fin) {
    var f1 = Origin.use(function f1() {}, { a: 1 })
    Assert.equal(f1.options.a, 1)
    fin()
  })

  it('object', function (fin) {
    var use = Origin.use

    try {
      use({ foo: 1 })
      Assert.fail()
    } catch (e) {
      Assert.equal('no_name', e.code)
      Assert.equal(
        'use-plugin: No name property found for plugin defined by Object {foo:1}.',
        e.message,
      )
    }

    try {
      use({ name: 'a', init: 1 })
      Assert.fail()
    } catch (e) {
      Assert.equal('no_init_function', e.code)
      Assert.equal(
        'use-plugin: The init property is not a function for plugin a defined by Object {name:a,init:1}.',
        e.message,
      )
    }

    try {
      use({ name: 'not-a-plugin' })
      Assert.fail()
    } catch (e) {
      Assert.equal('not_found', e.code)
    }

    var a = use({
      name: 'a',
      init: function () {
        return 'ar'
      },
    })
    Assert.equal('a', a.name)
    Assert.equal('ar', a.init())

    var p0 = use({ name: 'p0' })
    Assert.equal('p0', p0.name)

    var b = use({
      name: 'b',
      tag: '0',
      init: function () {},
    })

    Assert.equal('b', b.name)
    Assert.equal('0', b.tag)
    Assert.equal('b$0', b.full)

    var c = use({
      init: function c() {
        return 'ac'
      },
    })
    Assert.equal('c', c.name)
    Assert.equal('ac', c.init())

    fin()
  })

  it('error', function (fin) {
    var use = Origin.use

    try {
      use('not-a-plugin')
      Assert.fail()
    } catch (e) {
      Assert.equal(e.code, 'not_found')
      Assert.equal(e.details.name, 'not-a-plugin')

      fin()
    }
  })

  // NOTE: does not work if run using `lab -P test -g plugin-desc`
  // as module resolution fails
  it('basic-defaults', function (fin) {
    var p1 = Origin.use('p1', { b: 2 })

    expect(p1.name).equal('p1n')
    expect(p1.init()).equal('p1x')
    expect(p1.defaults).equal({ a: 1 })
    expect(p1.options).equal({ a: 1, b: 2 })

    var p2 = Origin.use(
      {
        name: 'p2n',
        init: function () {
          return 'p2x'
        },
        defaults: {
          a: 'A', // Origin.use.Joi.string().default('A'),
          b: 2,
          c: true,
          d: { e: 3 },
          f: { g: 4 },
        },
      },
      { c: false, f: { h: 5 } },
    )

    expect(p2.name).equal('p2n')
    expect(p2.init()).equal('p2x')
    expect(p2.defaults).contains({ b: 2, c: true, d: { e: 3 }, f: { g: 4 } })
    expect(p2.options).equal({
      c: false,
      f: { h: 5, g: 4 },
      a: 'A',
      b: 2,
      d: { e: 3 },
    })

    var p3f = function p3n() {
      return 'p3x'
    }
    p3f.defaults = { a: 1 }

    var p3 = Origin.use(p3f, { b: 2 })
    expect(p3.name).equal('p3n')
    expect(p3.init()).equal('p3x')
    expect(p3.defaults).contains({ a: 1 })
    expect(p3.options).equal({
      a: 1,
      b: 2,
    })

    fin()
  })

  it('no-merge-defaults', function (fin) {
    var use_nm = Origin.makeuse({ merge_defaults: false })

    // options are not merged
    var p0 = use_nm({
      name: 'p0',
      init: function () {},
      defaults: { a: 1, c: 4 },
      options: { a: 2, b: 3 },
    })

    expect(p0.defaults).equal({ a: 1, c: 4 })
    expect(p0.options).equal({ a: 2, b: 3 })

    // options are merged
    var p1 = Origin.use({
      name: 'p1',
      init: function () {},
      defaults: { a: 1, c: 4 },
      options: { a: 2, b: 3 },
    })

    expect(p1.defaults).equal({ a: 1, c: 4 })
    expect(p1.options).equal({ a: 2, b: 3, c: 4 })

    fin()
  })

  /* FIX: use Gubu to replace Optioner
  it('option-fail', function (fin) {
    try {
      Origin.use(
        {
          name: 'p2',
          init: function () {},
          defaults: Gubu({
            a: String
          }),
        },
        { a: 1 }
      )
      Code.fail()
    } catch (e) {
      expect(e.code).equals('invalid_option')
      expect(e.message).equals(
        'use-plugin: Plugin p2: option value is not valid: "a" must be a string in options { a: 1 }'
      )
      fin()
    }
  })
  */

  it('gubu-defaults', function (fin) {
    var g0 = Origin.use({
      init: () => {},
      defaults: Gubu({ a: 1 }),
    })

    expect(g0.defaults.gubu.gubu$).exist()
    expect(g0.defaults()).equal({ a: 1 })

    fin()
  })

  it('frozen-options', function (fin) {
    var f1 = Origin.use(function f1() {}, Object.freeze({ a: 1 }))
    Assert.equal(f1.options.a, 1)
    fin()
  })

  it('edges', function (fin) {
    try {
      Origin.use()
      Code.fail()
    } catch (e) {
      expect(e.code).equals('invalid_arguments')
    }

    try {
      Origin.use({})
      Code.fail()
    } catch (e) {
      expect(e.code).equals('no_name')
    }

    try {
      Origin.use({ name: 'p1', init: 'a' })
      Code.fail()
    } catch (e) {
      expect(e.code).equals('no_init_function')
    }

    try {
      Origin.use({ name: 'n1', init: null })
      Code.fail()
    } catch (e) {
      expect(e.code).equals('not_found')
    }

    try {
      Origin.use({ name: 'bad-require/br5.js', init: null })
      Code.fail()
    } catch (e) {
      expect(e.code).equals('syntax_error')
    }

    try {
      Origin.use('bad1')
      Code.fail()
    } catch (e) {
      expect(e.code).equals('not_found')
    }

    var n1 = Origin.use({ name: 'n1', init: function () {} }, null)
    expect(n1.options).equal({})

    fin()
  })

  it('intern-make_system_modules', function (fin) {
    Assert(Origin.makeuse.intern.make_system_modules().length > 0)
    fin()
  })
})

function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function (x, fin) {
        func(fin)
      }),
    )
  }
}
