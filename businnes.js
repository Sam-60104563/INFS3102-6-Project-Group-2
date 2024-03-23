const persistence = require('./mongodb');
const crypto = require('crypto');

async function validateCredentials(username, password) {
    return await persistence.validateCredentials(username, password);
}

async function startSession(data) {
    let sessionKey = crypto.randomUUID();
    let sd = {
        key: sessionKey,
        expiry: new Date(Date.now() + 60000), 
        data: data
    };
    await persistence.updateSession(sd);
    return sessionKey;
}

async function getSession(key) {
    return await persistence.getSession(key);
}

async function terminateSession(key) {
    return await persistence.deleteSession(key);
}

async function registerUser(username, password) {
    let success = await persistence.registerUser(username, password);
    return success;
}

module.exports = {
    registerUser,
    validateCredentials,
    startSession,
    getSession,
    terminateSession
};
