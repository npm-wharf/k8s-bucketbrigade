function checkBucket (api, bucketName) {
  if (api.gs) {
    return api.gs.getBuckets()
      .then(
        results => {
          const names = results[0].map(bucket => bucket.name)
          const exists = names.indexOf(bucketName) >= 0
          return exists
        },
        err => {
          console.log(`  could not get bucket list:\n\t${err.message}`)
          throw new Error(`Could not get bucket list: ${err.message}`)
        }
      )
  } else {
    return new Promise((resolve, reject) => {
      api.s3.listBuckets((err, data) => {
        if (err) {
          console.log(`  could not get bucket list:\n\t${err.message}`)
          reject(new Error(`Could not get bucket list: ${err.message}`))
        } else {
          const names = data.Buckets
          const exists = names.indexOf(bucketName) >= 0
          resolve(exists)
        }
      })
    })
  }
}

function createBucket (api, config, bucketName) {
  if (api.gs) {
    return api.gs.createBucket(bucketName)
      .then(
        onGSBucket.bind(null, api, config, bucketName),
        err => {
          console.log(`  failed to create bucket '${bucketName}':\n\t${err.message}`)
          throw new Error(`Cannot create the bucket '${bucketName}' via GS API due to error: ${err.message}`)
        }
      )
  } else {
    const bucket = {
      Bucket: bucketName,
      ACL: config.acl,
      CreateBucketConfiguration: {
        LocationConstraint: config.region
      },
      GrantFullControl: config.owner
    }
    return new Promise((resolve, reject) => {
      api.s3.createBucket(bucket, (err, data) => {
        if (err) {
          console.log(`  failed to create bucket '${bucketName}':\n\t${err.message}`)
          reject(new Error(`Cannot create the bucket '${bucketName}' via AWS API due to error: ${err.message}`))
        } else {
          console.log(`  bucket '${bucketName}' created successfully`)
          resolve(data.Location)
        }
      })
    })
  }
}

function onGSBucket (api, config, bucketName) {
  console.log(`  bucket '${bucketName}' created successfully`)
  return setGSACL(api, config, bucketName)
    .then(
      () => {
        console.log(`  permissions set on bucket '${bucketName}' successfully`)
        return bucketName
      },
      err => {
        console.log(`  failed to set permissions on bucket '${bucketName}':\n\t${err.message}`)
        throw new Error(`Failed to set desired permissions on '${bucketName}': ${err.message}`)
      }
    )
}

function setGSACL (api, config, bucketName) {
  const promises = [
    api.gs.bucket(bucketName)
      .acl.owners.addUser(config.owner)
  ]
  switch (config.acl) {
    case 'public':
      promises.push(
        api.gs.bucket(bucketName)
          .acl.writers.addAllUsers()
      )
      promises.push(
        api.gs.bucket(bucketName)
          .acl.readers.addAllUsers()
      )
      break
    case 'authenticated-read':
      promises.push(
        api.gs.bucket(bucketName)
            .acl.readers.addAllAuthenticatedUsers()
      )
      break
    case 'public-read':
      promises.push(
        api.gs.bucket(bucketName)
          .acl.readers.addAllUsers()
      )
      break
    case 'private':
      promises.push(
        api.gs.bucket(bucketName)
          .acl.readers.addDomain(config.owner.split('@')[1])
      )
      break
  }
  promises.push(
    api.gs.bucket(bucketName)
        .acl.readers.addProject(config.projectId)
  )
  promises.push(
    api.gs.bucket(bucketName)
        .acl.writers.addProject(config.projectId)
  )
  return Promise.all(promises)
}

function createIfMissing (api, config, bucketName, tries = 3) {
  if (tries > 0) {
    console.log(`checking for bucket '${bucketName}'`)
    return checkBucket(api, bucketName)
      .then(
        exists => {
          if (exists) {
            console.log(`  bucket '${bucketName}' exists`)
            return Promise.resolve(bucketName)
          } else {
            console.log(`  creating '${bucketName}'`)
            return createBucket(api, config, bucketName)
          }
        },
        err => {
          console.log(err.message)
          console.log(`trying again - ${tries} left`)
          return createIfMissing(api, config, bucketName, tries - 1)
        }
      )
  } else {
    console.log(`  failed to ensure the bucket '${bucketName}' exists`)
    return Promise.reject(new Error(`Cannot ensure the bucket '${bucketName}' exists`))
  }
}

module.exports = function (config, api) {
  return {
    createIfMissing: createIfMissing.bind(null, api, config)
  }
}
