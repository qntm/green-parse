/* eslint-env jest */

const json = require('./json')

describe('json example', () => {
  it('works', () => {
    expect([...json.topvalue(`
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
          "f" : -34.0001E-39
        }
      }
    `, 0)]).toEqual([{
      j: 234,
      match: {
        aAb: {
          cd: [{}, null, true, false, []],
          e: 2.7182,
          f: -34.0001e-39
        }
      }
    }])
  })
})
