const fs = require('fs');
const path = require('path');
const nock = require('nock');
const test = require('ava');

// Function
const createPost = require('./../create-post');
const publication = require('./fixtures/create-config');

// Tests
test('Creates a note', async t => {
  const body = require('./fixtures/type-note');
  nock('https://api.github.com').persist().put(/\bwatched-isle-of-dogs\b/g).reply(200);
  const response = await createPost(publication, body);
  t.is(response.code, 202);
});

test('Creates a photo', async t => {
  const body = require('./fixtures/type-note');
  const photo1 = fs.readFileSync(path.resolve(__dirname, 'fixtures/photo1.gif'));
  const files = [{
    buffer: Buffer.from(photo1),
    originalname: 'photo1.gif'
  }];
  nock('https://api.github.com').persist().put(/\bwatched-isle-of-dogs\b/g).reply(200);
  const response = await createPost(publication, body, files);
  t.is(response.code, 202);
});