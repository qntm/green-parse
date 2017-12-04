/**
  Generator matchers. Yields all possible results, ending immediately if need be.
*/

'use strict'

// It is assumed that `i` is between 0 and `string.length` inclusive.

/**
  Construct a Matcher function from a simple (generator) function.
  `inner` should take `string` and `i` and return a {next: () => ...}
*/
const Matcher = inner => Object.assign(
  // Can't just write `inner` here because we need
  // to add properties to `outer` but we don't want to modify
  // `inner`.
  (string, i) => inner(string, i),

  // Also there are methods and properties on the Matcher
  // function.
  {
    // Transform all of the matches
    map: f => Matcher((string, i) => {
      const iterator = inner(string, i)
      let done = false
      return {
        next: () => {
          while (!done) {
            const result = iterator.next()
            if (result.done) {
              done = true
            } else {
              return {
                value: {
                  j: result.value.j,
                  match: f(result.value.match)
                },
                done: false
              }
            }
          }

          return {done}
        }
      }
    }),

    // Only return those matches which pass the filter
    filter: f => Matcher((string, i) => {
      const iterator = inner(string, i)
      let done = false
      return {
        next: () => {
          while (!done) {
            const result = iterator.next()
            if (result.done) {
              done = true
            } else if (f(result.value.match)) {
              return {
                value: result.value,
                done: false
              }
            } // Otherwise ignore the result and keep iterating
          }

          return {done}
        }
      }
    }),

    star: () => star(inner),
    plus: () => plus(inner),
    or: other => or([inner, other]),
    seq: other => seq([inner, other]),
    wplus: ws => wplus(inner, ws)
  }
)

/**
  Match any single character from the JS string. Note that a JS string
  is a sequence of 16-bit code units, not a sequence of Unicode characters
*/
const chr = Matcher((string, i) => {
  let done = false
  return {
    next: () => {
      while (!done) {
        done = true
        if (i < string.length) {
          return {
            value: {
              j: i + 1,
              match: string.substr(i, 1)
            },
            done: false
          }
        }
      }

      return {done}
    }
  }
})

/**
  Match a single Unicode character from the JS string. This is
  a String of length 1 for BMP code points or a string of length
  2 for astral planes. This can FAIL if the string is not properly
  encoded i.e. surrogates are not paired correctly.
*/
const unicode = Matcher((string, i) => {
  const range = 1 << 10
  const high = 0xD800
  const low = 0xDC00

  let done = false
  return {
    next: () => {
      while (!done) {
        done = true
        const first = i < string.length ? string.charCodeAt(i) : undefined
        const second = i + 1 < string.length ? string.charCodeAt(i + 1) : undefined

        if (first !== undefined) {
          if (
            high <= first &&
            first < high + range
          ) {
            if (
              second !== undefined &&
              low <= second &&
              second < low + range
            ) {
              return {
                value: {
                  j: i + 1 + 1,
                  match: string.substr(i, 1 + 1)
                },
                done: false
              }
            } // else bad UTF-16
          } else {
            // BMP
            return {
              value: {
                j: i + 1,
                match: string.substr(i, 1)
              },
              done: false
            }
          }
        }
      }

      return {done}
    }
  }
})

// Also there are class methods on the constructor function.
const fixed = needle => Matcher((string, i) => {
  let done = false
  return {
    next: () => {
      while (!done) {
        done = true
        if (string.substr(i, needle.length) === needle) {
          return {
            value: {
              j: i + needle.length,
              match: needle
            },
            done: false
          }
        }
      }

      return {done}
    }
  }
})

/**
  Returns all the results from the first matcher and then all the results from
  the next matcher and so on
*/
const or = inners => Matcher((string, i) => {
  let done = false
  let innerId = -1
  let iterator
  return {
    next: () => {
      while (!done) {
        // We need to account for the case when the iterator is undefined,
        // since that's how this whole shebang will start out.
        // That also means that it's safe to exit the loop with the iterator
        // currently undefined, rather than just keep trying to find the next
        // "good" iterator inside this loop somehow.
        if (iterator) {
          const result = iterator.next()
          if (result.done) {
            iterator = undefined
          } else {
            return result
          }
        } else {
          innerId++
          if (innerId in inners) {
            const inner = inners[innerId]
            iterator = inner(string, i)
          } else {
            done = true
          }
        }
      }

      return {done}
    }
  }
})

/**
  For each result from the first matcher, returns all the results from the
  next matcher, and so on. Depth-first.
  TODO: it is probably possible to simplify this, maybe scrap
  the `depth` variable.
*/
const seq = inners => Matcher((string, i) => {
  const stack = []
  let done = false
  let depth = 0
  return {
    next: () => {
      while (!done) {
        if (depth === -1) {
          done = true
        } else if (depth === inners.length) {
          const value = {
            match: stack.map(frame => frame.value.match),
            j: stack.length === 0 ? i : stack[stack.length - 1].value.j
          }
          depth--
          return {
            value,
            done: false
          }
        } else {
          if (depth in stack) {
            const result = stack[depth].iterator.next()
            if (result.done) {
              stack.pop()
              depth--
            } else {
              stack[depth].value = result.value
              depth++
            }
          } else {
            stack.push({
              iterator: inners[depth](string, depth === 0 ? i : stack[stack.length - 1].value.j)
            })
          }
        }
      }

      return {done}
    }
  }
})

/**
  Returns an array of the matches. Goes depth-first.
  a* yields [], ['a'], ['a', 'a'], ...
  `inner` doesn't have to be a full-blown `Matcher` object,
  it just needs to be a generator function whose results are like {j, match}.
*/
const star = inner => Matcher((string, i) => {
  const stack = []
  let done = false
  let depth = 0
  return {
    next: () => {
      while (!done) {
        if (depth === -1) {
          done = true
        } else {
          if (depth in stack) {
            const result = stack[depth].iterator.next()
            if (result.done) {
              stack.pop()
              depth--
            } else {
              stack[depth].value = result.value
              depth++
            }
          } else {
            const value = {
              match: stack.map(frame => frame.value.match),
              j: stack.length === 0 ? i : stack[stack.length - 1].value.j
            }
            stack.push({
              iterator: inner(string, depth === 0 ? i : stack[stack.length - 1].value.j)
            })
            return {
              value,
              done: false
            }
          }
        }
      }

      return {done}
    }
  }
})

/**
  Resolve an object full of mutually recursive matchers together!
  The results are all matchers still! Variadic version of the Y
  combinator. Compare with the regular Y combinator:

  const y = unresolved =>
    (actualF =>
      actualF(actualF)
    )(f =>
      unresolved((...args) =>
        f(f).apply(undefined, args)
      )
    )

  and note the location of the `Matcher` construction call which
  ensures that even though `unresolveds` might be mere generator
  functions, the result will not be.
*/
const resolve = unresolveds => {
  const objectMap = (object, f) => {
    var mapped = {}
    Object.keys(object).forEach(key => {
      mapped[key] = f(object[key], key, object)
    })
    return mapped
  }

  const resolveds = (actualFs => objectMap(actualFs, actualF =>
    actualF(actualFs)
  ))(objectMap(unresolveds, unresolved => fs =>
    unresolved(objectMap(fs, f => Matcher((...args) =>
      f(fs).apply(undefined, args)
    )))
  ))

  // This would be an excellent time to check for null-stars
  // and left-recursion somehow

  return resolveds
}

// Bonuses!

/**
  Very familiar
*/
const plus = inner => seq([inner, star(inner)])
  .map(([first, rest]) => [first].concat(rest))

/**
  Match a sequence of things, separated by some separator. Don't allow
  anything before or after. The sequence has to have at least one entry. Omit
  the whitespace results from the match.
*/
const wseq = (inners, separator) => {
  if (inners.length === 0) {
    throw Error('Not well-defined for 0 inners')
  }

  return seq(inners.map((inner, i) =>
    i === 0 ? inner : seq([separator, inner]).map(([separator, inner]) => inner)
  ))
}

/**
  Match one or more identical thingies separated by separator...
*/
const wplus = (inner, separator) => seq([
  inner,
  seq([separator, inner]).map(([separator, inner]) => inner).star()
]).map(([first, rest]) => [first].concat(rest))

/**
  Replace the inner matcher with a parser, which will
  parse the entire supplied string as an instance of the given class. Strip
  the j off the result, too.
  Mainly for internal use in unit tests because it drops through to match()
  in a convenient way.
  `inner` doesn't have to be a full-blown `Matcher` object, as long as it
  returns generators which generate values of the form `{j, match}`.
*/
const Parser = inner => string => {
  const iterator = inner(string, 0)
  let done = false
  return {
    next: () => {
      while (!done) {
        const result = iterator.next()
        if (result.done) {
          done = true
        } else if (result.value.j === string.length) {
          return {
            value: result.value.match,
            done: false
          }
        } // otherwise ignore the partial parse tree
      }

      return {done}
    }
  }
}

module.exports = {Matcher, chr, unicode, fixed, or, seq, star, resolve, plus, wseq, wplus, Parser}
