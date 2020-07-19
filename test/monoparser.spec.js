'use strict'

const MonoParser = require('../src/mono-parser')

describe('MonoParser', () => {
  it('works', () => {
    const astar = MonoParser(fixed('a').star())
    expect(astar('aaa')).toEqual(['a', 'a', 'a'])
    expect(astar('a')).toEqual(['a'])
    expect(astar('')).toEqual([])
    expect(() => astar('aaab')).toThrowError('Expected 1 result, got 0')
    expect(() => astar('b')).toThrowError('Expected 1 result, got 0')
  })

  it('promotes a string to a fixed matcher', () => {
    const astar = MonoParser(star('a'))
    expect(astar('aaa')).toEqual(['a', 'a', 'a'])
    expect(astar('a')).toEqual(['a'])
    expect(astar('')).toEqual([])
    expect(() => astar('aaab')).toThrowError('Expected 1 result, got 0')
    expect(() => astar('b')).toThrowError('Expected 1 result, got 0')
  })

  it('dislikes ambiguity', () => {
    const ambiguous1 = Parser(or([
      seq([fixed('a'), fixed('aa')]),
      seq([fixed('aa'), fixed('a')])
    ]))
    const iterator = ambiguous1('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'aa'], done: false })
    expect(iterator.next()).toEqual({ value: ['aa', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })

    const ambiguous2 = MonoParser(or([
      seq([fixed('a'), fixed('aa')]),
      seq([fixed('aa'), fixed('a')])
    ]))
    expect(() => ambiguous2('aaa')).toThrowError('Expected 1 result, got at least 2')
  })
})
