const Request = require('../request');
const Test = require('../test');
const CryptoJS = require('crypto-js');
const db = require(liliumroot + '/includes/db');
const configLib = require(liliumroot + '/config');
const base32Encode = require('base32-encode');
const otplib = require('otplib');

class AuthenticationTest extends Test {
    constructor(logger) {
        super('Authentication tests', [], logger);
    }

    prepare(then) {
        const pwd = Math.random().toString(16).substring(2);

        this.generatedUser = {
            username : Math.random().toString(16).substring(2),
            plaintextpwd : pwd, shhh : CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex),
            displayname : 'Lilium authentication test user',
            roles : ["author"], welcomed : true, sites : [configLib.default().id]
        };

        this.firstTimer = {
            username : Math.random().toString(16).substring(2),
            plaintextpwd : pwd, shhh : CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex),
            displayname : 'Lilium authentication test first timer',
            roles : ["author"], welcomed : false, sites : [configLib.default().id]
        }

        this.twoFaUser = {
            username : Math.random().toString(16).substring(2),
            plaintextpwd : pwd, shhh : CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex),
            displayname : 'Lilium authentication test 2-fa entity',
            roles : ["author"], welcomed : true, enforce2fa : true, confirmed2fa : true,
            sites : [configLib.default().id]
        }

        db.insert(configLib.default(), 'entities', [this.generatedUser, this.firstTimer, this.twoFaUser], () => {
            // Login page should exist
            this.addTask(new Request("Basic get request").to('GET', '/login'));

            // Wrong credentials should fail
            this.addTask(new Request("Wrong credential login").to('POST', '/login').setPostData({ 
                usr : 'notauser', 
                psw : 'notapassword' 
            }).expect((err, r, body) => !body.success));

            // Good credentials should pass
            this.addTask(new Request("Normal logic with right username and password combo").to('POST', '/login').setPostData({ 
                usr : this.generatedUser.username, 
                psw : this.generatedUser.plaintextpwd 
            }).expect((err, r, body) => body.success));

            // First timers should be redirected to onboarding
            this.addTask(new Request("First login with right username and password combo").to('POST', '/login').setPostData({ 
                usr : this.firstTimer.username, 
                psw : this.firstTimer.plaintextpwd 
            }).expect((err, r, body) => r.statusCode == 302));

            // 2-FA users should require a valid token
            this.addTask(new Request("Valid credentials but no 2FA token").to('POST', '/login').setPostData({ 
                usr : this.twoFaUser.username,
                psw : this.twoFaUser.plaintextpwd
            }).expect((err, r, body) => !body.success));

            this.addTask(new Request("Valid credentials with valid 2FA token").to('POST', '/login').setPostData({ 
                usr : this.twoFaUser.username,
                psw : this.twoFaUser.plaintextpwd,
                token2fa : otplib.authenticator.generate(
                    base32Encode(Buffer.from(this.twoFaUser._id.toString() + configLib.default().signature.privatehash), 'RFC4648').substring(0, 32)
                )
            }).expect((err, r, body) => body.success));


            super.prepare(then);
        });
    }

    cleanUp(then) {
        db.remove(configLib.default(), 'entities', {}, () => {
            super.cleanUp(then);
        });
    }
}

module.exports = AuthenticationTest;
