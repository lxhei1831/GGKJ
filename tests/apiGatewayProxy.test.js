const assert = require('assert')

const gateway = require('../cloudfunctions/apiGateway/index')

assert.strictEqual(gateway.__test.isAllowedRequest('POST', '/api/auth/wechat/phone-login'), true, 'phone login should be proxied')
assert.strictEqual(gateway.__test.isAllowedRequest('GET', '/api/auth/me'), true, 'current user request should be proxied')
assert.strictEqual(gateway.__test.isAllowedRequest('GET', '/api/admin/users'), false, 'admin APIs should not be proxied from mini program')
assert.strictEqual(gateway.__test.isAllowedRequest('POST', 'http://example.com/api/auth/me'), false, 'absolute URLs should not be proxied')

const normalized = gateway.__test.normalizePath('api/auth/me')
assert.strictEqual(normalized, '/api/auth/me', 'proxy path should be normalized with a leading slash')
