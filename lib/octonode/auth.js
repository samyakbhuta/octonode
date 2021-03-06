(function() {
  var auth, qs, request;

  request = require('request');

  qs = require('querystring');

  auth = module.exports = {
    modes: {
      cli: 0,
      web: 1
    },
    config: function(options) {
      if (options.username && options.password) {
        this.mode = this.modes.cli;
      } else if (options.id && options.secret) {
        this.mode = this.modes.web;
      } else {
        throw new Error('No working mode recognized');
      }
      this.options = options;
      return this;
    },
    revoke: function(id, callback) {
      if (this.mode === this.modes.cli) {
        return request({
          url: "https://" + this.options.username + ":" + this.options.password + "@api.github.com/authorizations/" + id,
          method: 'DELETE'
        }, function(err, res, body) {
          if ((err != null) || res.statusCode !== 204) {
            return callback(err || new Error(JSON.parse(body).message));
          } else {
            return callback(null);
          }
        });
      } else {
        return callback(new Error('Cannot revoke authorization in web mode'));
      }
    },
    login: function(scopes, callback) {
      var uri;
      if (this.mode === this.modes.cli) {
        if (scopes instanceof Array) {
          scopes = JSON.stringify({
            scopes: scopes
          });
        } else {
          scopes = JSON.stringify(scopes);
        }
        return request({
          url: "https://" + this.options.username + ":" + this.options.password + "@api.github.com/authorizations",
          method: 'POST',
          body: scopes,
          headers: {
            'Content-Type': 'application/json'
          }
        }, function(err, res, body) {
          try {
            body = JSON.parse(body);
          } catch (err) {
            callback(new Error('Unable to parse body'));
          }
          if (res.statusCode === 401) {
            return callback(new Error(body.message));
          } else {
            return callback(null, body.id, body.token);
          }
        });
      } else if (this.mode === this.modes.web) {
        if (scopes instanceof Array) {
          uri = 'https://github.com/login/oauth/authorize';
          uri += '?client_id=' + this.options.id;
          return uri += '&scope=' + scopes.join(',');
        } else {
          return request({
            url: 'https://github.com/login/oauth/access_token',
            method: 'POST',
            body: qs.stringify({
              code: scopes,
              client_id: this.options.id,
              client_secret: this.options.secret
            }),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }, function(err, res, body) {
            if (res.statusCode === 404) {
              return callback(new Error('Access token not found'));
            } else {
              body = qs.parse(body);
              if (body.error) {
                return callback(new Error(body.error));
              } else {
                return callback(null, body.access_token);
              }
            }
          });
        }
      } else {
        return callback(new Error('No working mode defined'));
      }
    }
  };

}).call(this);
