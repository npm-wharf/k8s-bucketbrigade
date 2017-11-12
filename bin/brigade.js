#!/usr/bin/env node
require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command>')
  .command(require('../src/create')())
  .help()
  .version()
  .argv
