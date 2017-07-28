/*jshint node:true */
'use strict';

var crypto = require('crypto');

var key = crypto.randomBytes(256).toString('base64');

console.log(key);
