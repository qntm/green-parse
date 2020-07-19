'use strict'

const Matcher = require('../src/matcher')
const Parser = require('../src/parser')

describe('Parser', () => {
  it('works', () => {
    const astar = Parser(Matcher('a').star())
    const iterator = astar('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'a', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })

  it('promotes a string to a fixed matcher', () => {
    const astar = Parser(star('a'))
    const iterator = astar('aaa')
    expect(iterator.next()).toEqual({ value: ['a', 'a', 'a'], done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })
})
