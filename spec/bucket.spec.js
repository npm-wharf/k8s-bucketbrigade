require('./setup')

const Bucket = require('../src/bucket')

const aws = {
  createBucket: () => {},
  listBuckets: () => {}
}

const google = {
  getBuckets: () => {},
  createBucket: () => {},
  bucket: () => {}
}

const acl = {
  acl: {
    owners: {
      addUser: () => {}
    },
    writers: {
      addDomain: () => {},
      addProject: () => {},
      addAllUsers: () => {},
      addAllAuthenticatedUsers: () => {}
    },
    readers: {
      addDomain: () => {},
      addProject: () => {},
      addAllUsers: () => {},
      addAllAuthenticatedUsers: () => {}
    }
  }
}

describe('Bucket', function () {
  describe('AWS', function () {
    describe('when bucket already exists', function () {
      let s3Mock, bucket, result
      before(function () {
        s3Mock = sinon.mock(aws)
        s3Mock
          .expects('listBuckets')
          .once()
          .yields(null, {Buckets: ['test-bucket']})

        s3Mock
          .expects('createBucket')
          .never()

        bucket = Bucket({}, {s3: aws})
        return bucket.createIfMissing('test-bucket')
          .then(x => {
            result = x
          })
      })

      it('should not attempt to re-create bucket', function () {
        result.should.equal('test-bucket')
        s3Mock.verify()
      })
    })

    describe('when bucket does not exist', function () {
      let s3Mock, bucket, result
      before(function () {
        s3Mock = sinon.mock(aws)
        s3Mock
          .expects('listBuckets')
          .once()
          .yields(null, {Buckets: ['other-bucket']})

        s3Mock
          .expects('createBucket')
          .withArgs({
            Bucket: 'test-bucket',
            ACL: 'public',
            CreateBucketConfiguration: {
              LocationConstraint: 'us-east-1'
            },
            GrantFullControl: 'some-iam-id-probably'
          })
          .yields(null, {Location: 'tada'})

        bucket = Bucket(
          {
            acl: 'public',
            region: 'us-east-1',
            owner: 'some-iam-id-probably'
          },
          {
            s3: aws
          }
        )
        return bucket.createIfMissing('test-bucket')
          .then(x => {
            result = x
          })
      })

      it('should create bucket', function () {
        result.should.equal('tada')
        s3Mock.verify()
      })
    })

    describe('when listBuckets call fails', function () {
      let s3Mock, bucket, result
      before(function () {
        s3Mock = sinon.mock(aws)
        s3Mock
          .expects('listBuckets')
          .once()
          .yields(new Error('buh'))

        bucket = Bucket({}, {s3: aws})
        return bucket.createIfMissing('test-bucket', 1)
          .then(
            null,
            x => {
              result = x
            }
          )
      })

      it('should reject with error', function () {
        result.message.should.equal(`Cannot ensure the bucket 'test-bucket' exists`)
        s3Mock.verify()
      })
    })

    describe('when bucket creation fails', function () {
      let s3Mock, bucket, result
      before(function () {
        s3Mock = sinon.mock(aws)
        s3Mock
          .expects('listBuckets')
          .once()
          .yields(null, {Buckets: ['other-bucket']})

        s3Mock
          .expects('createBucket')
          .withArgs({
            Bucket: 'test-bucket',
            ACL: 'public',
            CreateBucketConfiguration: {
              LocationConstraint: 'us-east-1'
            },
            GrantFullControl: 'some-iam-id-probably'
          })
          .yields(new Error('uhuh'))

        bucket = Bucket(
          {
            acl: 'public',
            region: 'us-east-1',
            owner: 'some-iam-id-probably'
          },
          {
            s3: aws
          }
        )
        return bucket.createIfMissing('test-bucket')
          .then(
            null,
            x => {
              result = x
            }
          )
      })
      it('should create bucket', function () {
        result.message.should.equal(`Cannot create the bucket 'test-bucket' via AWS API due to error: uhuh`)
        s3Mock.verify()
      })
    })
  })

  describe('GS', function () {
    describe('when bucket already exists', function () {
      let gsMock, bucket, result
      before(function () {
        gsMock = sinon.mock(google)
        gsMock
          .expects('getBuckets')
          .once()
          .resolves([[{name: 'test-bucket'}]])

        gsMock
          .expects('createBucket')
          .never()

        bucket = Bucket({}, {gs: google})
        return bucket.createIfMissing('test-bucket')
          .then(x => {
            result = x
          })
      })

      it('should not attempt to re-create bucket', function () {
        result.should.equal('test-bucket')
        gsMock.verify()
      })
    })

    describe('when bucket does not exist', function () {
      describe('when ACL is set to private', function () {
        let gsMock, bucket, result
        let ownersMock, readersMock, writersMock
        before(function () {
          gsMock = sinon.mock(google)
          ownersMock = sinon.mock(acl.acl.owners)
          readersMock = sinon.mock(acl.acl.readers)
          writersMock = sinon.mock(acl.acl.writers)
          gsMock
            .expects('getBuckets')
            .once()
            .resolves([[{name: 'other-bucket'}]])

          gsMock
            .expects('createBucket')
            .withArgs('test-bucket')
            .resolves()

          gsMock
            .expects('bucket')
            .withArgs('test-bucket')
            .exactly(5)
            .returns(acl)

          ownersMock
            .expects('addUser')
            .withArgs('me@me.me')
            .resolves()

          readersMock
            .expects('addAllUsers')
            .resolves()

          writersMock
            .expects('addAllUsers')
            .resolves()

          readersMock
            .expects('addProject')
            .withArgs('viewers-supersecretproject')
            .resolves()

          writersMock
            .expects('addProject')
            .withArgs('editors-supersecretproject')
            .resolves()

          bucket = Bucket(
            {
              acl: 'public',
              projectId: 'supersecretproject',
              owner: 'me@me.me' // "memail"
            },
            {gs: google}
          )
          return bucket.createIfMissing('test-bucket')
            .then(x => {
              result = x
            })
        })

        it('should create bucket with expected permissions', function () {
          result.should.equal('test-bucket')
          gsMock.verify()
          ownersMock.verify()
          readersMock.verify()
          writersMock.verify()
        })
      })

      describe('when ACL is set to authenticated-read', function () {
        let gsMock, bucket, result
        let ownersMock, readersMock, writersMock
        before(function () {
          gsMock = sinon.mock(google)
          ownersMock = sinon.mock(acl.acl.owners)
          readersMock = sinon.mock(acl.acl.readers)
          writersMock = sinon.mock(acl.acl.writers)
          gsMock
            .expects('getBuckets')
            .once()
            .resolves([[{name: 'other-bucket'}]])

          gsMock
            .expects('createBucket')
            .withArgs('test-bucket')
            .resolves()

          gsMock
            .expects('bucket')
            .withArgs('test-bucket')
            .exactly(4)
            .returns(acl)

          ownersMock
            .expects('addUser')
            .withArgs('me@me.me')
            .resolves()

          readersMock
            .expects('addAllAuthenticatedUsers')
            .resolves()

          readersMock
            .expects('addProject')
            .withArgs('viewers-supersecretproject')
            .resolves()

          writersMock
            .expects('addProject')
            .withArgs('editors-supersecretproject')
            .resolves()

          bucket = Bucket(
            {
              acl: 'authenticated-read',
              projectId: 'supersecretproject',
              owner: 'me@me.me'
            },
            {gs: google}
          )
          return bucket.createIfMissing('test-bucket')
            .then(x => {
              result = x
            })
        })

        it('should create bucket with expected permissions', function () {
          result.should.equal('test-bucket')
          gsMock.verify()
          ownersMock.verify()
          readersMock.verify()
          writersMock.verify()
        })
      })

      describe('when ACL is set to public-read', function () {
        let gsMock, bucket, result
        let ownersMock, readersMock, writersMock
        before(function () {
          gsMock = sinon.mock(google)
          ownersMock = sinon.mock(acl.acl.owners)
          readersMock = sinon.mock(acl.acl.readers)
          writersMock = sinon.mock(acl.acl.writers)
          gsMock
            .expects('getBuckets')
            .once()
            .resolves([[{name: 'other-bucket'}]])

          gsMock
            .expects('createBucket')
            .withArgs('test-bucket')
            .resolves()

          gsMock
            .expects('bucket')
            .withArgs('test-bucket')
            .exactly(4)
            .returns(acl)

          ownersMock
            .expects('addUser')
            .withArgs('me@me.me')
            .resolves()

          readersMock
            .expects('addAllUsers')
            .resolves()

          readersMock
            .expects('addProject')
            .withArgs('viewers-supersecretproject')
            .resolves()

          writersMock
            .expects('addProject')
            .withArgs('editors-supersecretproject')
            .resolves()

          bucket = Bucket(
            {
              acl: 'public-read',
              projectId: 'supersecretproject',
              owner: 'me@me.me'
            },
            {gs: google}
          )
          return bucket.createIfMissing('test-bucket')
            .then(x => {
              result = x
            })
        })

        it('should create bucket with expected permissions', function () {
          result.should.equal('test-bucket')
          gsMock.verify()
          ownersMock.verify()
          readersMock.verify()
          writersMock.verify()
        })
      })

      describe('when ACL is set to public', function () {
        let gsMock, bucket, result
        let ownersMock, readersMock, writersMock
        before(function () {
          gsMock = sinon.mock(google)
          ownersMock = sinon.mock(acl.acl.owners)
          readersMock = sinon.mock(acl.acl.readers)
          writersMock = sinon.mock(acl.acl.writers)
          gsMock
            .expects('getBuckets')
            .once()
            .resolves([[{name: 'other-bucket'}]])

          gsMock
            .expects('createBucket')
            .withArgs('test-bucket')
            .resolves()

          gsMock
            .expects('bucket')
            .withArgs('test-bucket')
            .exactly(4)
            .returns(acl)

          ownersMock
            .expects('addUser')
            .withArgs('me@me.me')
            .resolves()

          readersMock
            .expects('addDomain')
            .withArgs('me.me')
            .resolves()

          readersMock
            .expects('addProject')
            .withArgs('viewers-supersecretproject')
            .resolves()

          writersMock
            .expects('addProject')
            .withArgs('editors-supersecretproject')
            .resolves()

          bucket = Bucket(
            {
              acl: 'private',
              projectId: 'supersecretproject',
              owner: 'me@me.me',
              org: 'me.me'
            },
            {gs: google}
          )
          return bucket.createIfMissing('test-bucket')
            .then(x => {
              result = x
            })
        })

        it('should create bucket with expected permissions', function () {
          result.should.equal('test-bucket')
          gsMock.verify()
          ownersMock.verify()
          readersMock.verify()
          writersMock.verify()
        })
      })
    })

    describe('when getBuckets call fails', function () {
      let gsMock, bucket, result
      before(function () {
        gsMock = sinon.mock(google)
        gsMock
          .expects('getBuckets')
          .once()
          .rejects(new Error('access denied or something'))

        gsMock
          .expects('createBucket')
          .never()

        bucket = Bucket({}, {gs: google})
        return bucket.createIfMissing('test-bucket', 1)
          .then(
            null,
            x => {
              result = x
            }
          )
      })

      it('should reject with error', function () {
        result.message.should.equal(`Cannot ensure the bucket 'test-bucket' exists`)
        gsMock.verify()
      })
    })

    describe('when createBucket call fails', function () {
      let gsMock, bucket, result
      before(function () {
        gsMock = sinon.mock(google)
        gsMock
          .expects('getBuckets')
          .once()
          .resolves([[{name: 'other-bucket'}]])

        gsMock
          .expects('createBucket')
          .withArgs('test-bucket')
          .rejects(new Error('nah'))

        bucket = Bucket(
          {
            acl: 'public',
            projectId: 'supersecretproject',
            owner: 'me@me.me' // "memail"
          },
          {gs: google}
        )
        return bucket.createIfMissing('test-bucket')
          .then(
            null,
            x => { result = x }
          )
      })

      it('should reject with error', function () {
        result.message.should.equal(`Cannot create the bucket 'test-bucket' via GS API due to error: nah`)
        gsMock.verify()
      })
    })

    describe('when bucket creation fails on setting ownership', function () {
      let gsMock, bucket, result
      let ownersMock, readersMock, writersMock
      before(function () {
        gsMock = sinon.mock(google)
        ownersMock = sinon.mock(acl.acl.owners)
        readersMock = sinon.mock(acl.acl.readers)
        writersMock = sinon.mock(acl.acl.writers)
        gsMock
          .expects('getBuckets')
          .once()
          .resolves([[{name: 'other-bucket'}]])

        gsMock
          .expects('createBucket')
          .withArgs('test-bucket')
          .resolves()

        gsMock
          .expects('bucket')
          .withArgs('test-bucket')
          .exactly(1)
          .returns(acl)

        ownersMock
          .expects('addUser')
          .withArgs('me@me.me')
          .rejects(new Error('no'))

        bucket = Bucket(
          {
            acl: 'public',
            projectId: 'supersecretproject',
            owner: 'me@me.me' // "memail"
          },
          {gs: google}
        )
        return bucket.createIfMissing('test-bucket')
          .then(
            null,
            x => {
              result = x
            })
      })

      it('should create bucket with expected permissions', function () {
        result.message.should.equal('Failed to set desired permissions on \'test-bucket\': no')
        gsMock.verify()
        ownersMock.verify()
        readersMock.verify()
        writersMock.verify()
      })
    })

    describe('when bucket creation fails on granting writer permissions', function () {
      let gsMock, bucket, result
      let ownersMock, readersMock, writersMock
      before(function () {
        gsMock = sinon.mock(google)
        ownersMock = sinon.mock(acl.acl.owners)
        readersMock = sinon.mock(acl.acl.readers)
        writersMock = sinon.mock(acl.acl.writers)
        gsMock
          .expects('getBuckets')
          .once()
          .resolves([[{name: 'other-bucket'}]])

        gsMock
          .expects('createBucket')
          .withArgs('test-bucket')
          .resolves()

        gsMock
          .expects('bucket')
          .withArgs('test-bucket')
          .exactly(2)
          .returns(acl)

        ownersMock
          .expects('addUser')
          .withArgs('me@me.me')
          .resolves()

        writersMock
          .expects('addAllUsers')
          .rejects(new Error('no'))

        bucket = Bucket(
          {
            acl: 'public',
            projectId: 'supersecretproject',
            owner: 'me@me.me' // "memail"
          },
          {gs: google}
        )
        return bucket.createIfMissing('test-bucket')
          .then(
            null,
            x => {
              result = x
            })
      })

      it('should create bucket with expected permissions', function () {
        result.message.should.equal('Failed to set desired permissions on \'test-bucket\': no')
        gsMock.verify()
        ownersMock.verify()
        readersMock.verify()
        writersMock.verify()
      })
    })
  })
})
