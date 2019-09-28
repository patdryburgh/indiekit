require('dotenv').config();

const nock = require('nock');
const sinon = require('sinon');
const test = require('ava');
const defaults = require('@indiekit/config-jekyll');
const Publication = require('@indiekit/publication');
const Publisher = require('@indiekit/publisher-github');

const github = new Publisher({
  token: 'abc123',
  user: 'user',
  repo: 'repo'
});

const pub = new Publication({
  defaults,
  endpointUrl: 'https://endpoint.example',
  publisher: github,
  url: process.env.INDIEKIT_URL
});

const {updatePost} = require('../.');

test.beforeEach(t => {
  t.context.postData = {
    type: 'note',
    path: 'baz.md',
    url: 'https://foo.bar/baz',
    mf2: {
      type: ['h-entry'],
      properties: {
        content: ['hello world'],
        published: ['2019-08-17T23:56:38.977+01:00'],
        category: ['foo', 'bar'],
        slug: ['baz']
      }
    }
  };
  t.context.req = async body => {
    const req = {};
    req.body = body;
    req.session = sinon.stub().returns(req);
    req.status = sinon.stub().returns(req);
    req.json = sinon.stub().returns(req);
    req.app = {
      locals: {
        pub: await pub.getConfig()
      }
    };
    return req;
  };
});

test.serial('Updates a post by replacing its content', async t => {
  // Mock GitHub update file request
  const scope = nock('https://api.github.com')
    .get(uri => uri.includes('baz.md'))
    .reply(200, {
      content: 'Zm9vYmFy'
    })
    .put(uri => uri.includes('baz.md'))
    .reply(200);

  // Setup
  const req = await t.context.req({
    action: 'update',
    url: 'https://foo.bar/baz',
    replace: {
      content: ['hello moon']
    }
  });
  const updated = await updatePost(req, t.context.postData);

  // Test assertions
  t.is(updated.mf2.properties.content[0], 'hello moon');
  scope.done();
});

test.serial('Updates a post by adding a syndication value', async t => {
  // Mock GitHub update file request
  const scope = nock('https://api.github.com')
    .get(uri => uri.includes('baz.md'))
    .reply(200, {
      content: 'Zm9vYmFy'
    })
    .put(uri => uri.includes('baz.md'))
    .reply(200);

  // Setup
  const req = await t.context.req({
    action: 'update',
    url: 'https://foo.bar/baz',
    add: {
      syndication: ['http://web.archive.org/web/20190818120000/https://foo.bar/baz']
    }
  });
  const updated = await updatePost(req, t.context.postData);

  // Test assertions
  t.is(updated.mf2.properties.syndication[0], 'http://web.archive.org/web/20190818120000/https://foo.bar/baz');
  scope.done();
});

test.serial('Updates a post by deleting a property', async t => {
  // Mock GitHub update file request
  const scope = nock('https://api.github.com')
    .get(uri => uri.includes('baz.md'))
    .reply(200, {
      content: 'Zm9vYmFy'
    })
    .put(uri => uri.includes('baz.md'))
    .reply(200);

  // Setup
  const req = await t.context.req({
    action: 'update',
    url: 'https://foo.bar/baz',
    delete: ['category']
  });
  const updated = await updatePost(req, t.context.postData);

  // Test assertions
  t.falsy(updated.mf2.properties.category);
  scope.done();
});

test.serial('Updates a post by deleting an entry in a property', async t => {
  // Mock GitHub update file request
  const scope = nock('https://api.github.com')
    .get(uri => uri.includes('baz.md'))
    .reply(200, {
      content: 'Zm9vYmFy'
    })
    .put(uri => uri.includes('baz.md'))
    .reply(200);

  // Setup
  const req = await t.context.req({
    action: 'update',
    url: 'https://foo.bar/baz',
    delete: {
      category: ['foo']
    }
  });
  const updated = await updatePost(req, t.context.postData);

  // Test assertions
  t.deepEqual(updated.mf2.properties.category, ['bar']);
  scope.done();
});

test.serial('Throws publisher error updating a post', async t => {
  // Mock GitHub update file request
  const scope = nock('https://api.github.com')
    .get(uri => uri.includes('baz.md'))
    .reply(200, {
      content: 'Zm9vYmFy'
    })
    .put(uri => uri.includes('baz.md'))
    .replyWithError('not found');

  // Setup
  const req = await t.context.req({
    action: 'update',
    url: 'https://foo.bar/baz',
    replace: {
      content: ['hello moon']
    }
  });
  const error = await t.throwsAsync(updatePost(req, t.context.postData));

  // Test assertions
  t.regex(error.message, /\bnot found\b/);
  scope.done();
});
