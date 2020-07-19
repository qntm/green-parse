const Parser = inner => function* (string) {
  for (const value of inner(string, 0)) {
    if (value.j === string.length) {
      yield value.match
    }
  }
}

module.exports = Parser
