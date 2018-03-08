# k8s-bucketbrigade

create s3/gse buckets as part of cluster initialization in a kubernetes job

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

## Installation (via Hikaru)

It's likely you'd want to just use one of the the TOML spec files in the repo for your own cluster.

As written, the google spec will prompt you for several tokens:

 * `namespace` - the namespace to create the job in
 * `acl` - the default access level for buckets
 * `owner` - the id (email) for the future owner of the buckets
 * `gs_id` - the id (email) for the account
 * `project_id` - your Project's display name in the dashboard
 * `buckets` - the comma delimited list of buckets to create

This approach also assumes that you will provide the private key for the account mentioned via `gs_id` in a `private.key` file placed next to the `gs.toml` file. It will store this in a Kubernetes configuration map.

## Environment Variables

### Setting Access To The Bucket(s)

 * `BUCKET_OWNER`
 * `BUCKET_ORG` - used to set private, org-wide ownership
 * `BUCKET_ACL`
    * 'private' (default)
    * 'public-read'
    * 'authenticated-read'
    * 'public'

### Credentials For Bucket Creation

AWS:

 * `AWS_ACCESS_KEY_ID`
 * `AWS_SECRET_ACCESS_KEY`
 * `AWS_DEFAULT_REGION`
    * 'EU'
    * 'eu-west-1'
    * 'us-west-1' (default)
    * 'us-west-2'
    * 'ap-south-1'
    * 'ap-southeast-1'
    * 'ap-southeast-2'
    * 'ap-northeast-1'
    * 'sa-east-1' 
    * 'cn-north-1'
    * 'eu-central-1'

GS:

 * `GS_PROJECT_ID`
 * `GS_USER_ID`
 * `GS_USER_KEY`

[travis-url]: https://travis-ci.org/npm/mcgonagall
[travis-image]: https://travis-ci.org/npm-wharf/k8s-bucketbrigade.svg?branch=master
[coveralls-url]: https://coveralls.io/github/npm-wharf/k8s-bucketbrigade?branch=master
[coveralls-image]: https://coveralls.io/repos/github/npm-wharf/k8s-bucketbrigade/badge.svg?branch=master
