const Bucket = require('./bucket')
const Promise = require('bluebird')
const api = require('./api')

function build () {
  return {
    buckets: {
      alias: 'b',
      describe: 'one or more bucket names to create if they do not exist'
    },
    acl: {
      alias: 'a',
      describe: 'the default ACL to begin with for the buckets created',
      choices: [ 'private', 'public-read', 'authenticated-read', 'public' ],
      default: 'private'
    },
    region: {
      alias: 'r',
      describe: 'sets a region (AWS) for the bucket',
      default: 'us-west-1',
      choices: [ 'EU', 'eu-west-1', 'us-west-1', 'us-west-2', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'sa-east-1', 'cn-north-1', 'eu-central-1' ]
    },
    'owner': {
      alias: 'o',
      describe: 'set an owner principle id (IAM or email depending on AWS vs GS)',
      default: process.env.BUCKET_OWNER
    },
    'org': {
      alias: 'g',
      describe: 'set an organization id to use when assigning private access to bucket',
      default: process.env.BUCKET_ORG
    }
  }
}

function handler (argv) {
  const bucket = Bucket(argv, api)
  const buckets = /[,]/.test(argv.buckets) ? argv.buckets.split(',') : [ argv.buckets ]
  return Promise.mapSeries(
    buckets,
    name => bucket.createIfMissing(name)
  )
}

module.exports = function () {
  return {
    command: 'create',
    desc: 'creates object store buckets and sets permissions',
    build,
    handler
  }
}
