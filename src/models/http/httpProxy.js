'use strict';

var http = require('http'),
    https = require('https'),
    url = require('url'),
    Q = require('q'),
    AbstractProxy = require('../abstractProxy');

function create (logger) {

    function identity (what) {
        return what;
    }

    function setupProxy (baseUrl, originalRequest) {
        var parts = url.parse(baseUrl),
            protocol = parts.protocol === 'https:' ? https : http,
            options = {
                method: originalRequest.method,
                hostname: parts.hostname,
                port: parts.port,
                auth: parts.auth,
                path: originalRequest.path,
                headers: originalRequest.headers
            };
        options.headers.connection = 'close';

        var proxiedRequest = protocol.request(options);
        if (originalRequest.body) {
            proxiedRequest.write(originalRequest.body);
        }
        return proxiedRequest;
    }

    function proxy (proxiedRequest) {
        var deferred = Q.defer();

        proxiedRequest.end();

        proxiedRequest.once('response', function (response) {
            response.body = '';
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                response.body += chunk;
            });
            response.on('end', function () {
                var stubResponse = {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.body
                };
                deferred.resolve(stubResponse);
            });
        });

        return deferred.promise;
    }

    return AbstractProxy.implement(logger, {
        formatRequest: identity,
        formatResponse: identity,
        formatDestination: identity,
        setupProxy: setupProxy,
        proxy: proxy
    });
}

module.exports = {
    create: create
};