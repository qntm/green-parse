/* eslint-env mocha */

import assert from 'assert'

import json from '../examples/json.js'

describe('json example', () => {
  it('works', () => {
    assert.deepStrictEqual([...json.topvalue(`
      {
        "a\\u0041b" : {
          "cd" : [
            { } ,
            null ,
            true ,
            false  , 
            [ ]
          ],
          "e" : 2.7182 ,
          "f\\"\\\\\\/\\b\\f\\n\\r\\t" : -34.0001E-39
        }
      }
    `, 0)], [{
      j: 250,
      match: {
        aAb: {
          cd: [{}, null, true, false, []],
          e: 2.7182,
          'f"\\/\b\f\n\r\t': -34.0001e-39
        }
      }
    }])
  })
})
