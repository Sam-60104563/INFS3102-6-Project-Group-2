const persistence = require('./persistence');
const crypto = require('crypto');

async function attemptLogin(username, password) {
    try {
        let hash = crypto.createHash('sha256');
        hash.update(password);
        let hashPass = hash.digest('hex');

        let details = await persistence.getUserDetails(username);
        if (!details || details.password !== hashPass) {
            return undefined;
        }

        let sessionKey = crypto.randomUUID();
        let sd = {
            key: sessionKey,
            expiry: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes expiry
            data: {
                username: details.username
            }
        };
        await persistence.startSession(sd);
        return sd;
    } catch (error) {
        console.error('Error during login attempt:', error);
        return undefined;
    }
}

async function terminateSession(key) {
    if (!key) {
        return;
    }
    await persistence.terminateSession(key);
}

async function getSession(key) {
    return await persistence.getSession(key);
}

async function registerUser(username, password) {
    try {
        let hash = crypto.createHash('sha256');
        hash.update(password);
        let hashedPassword = hash.digest('hex');

        let success = await persistence.registerUser(username, hashedPassword);
        return success;
    } catch (error) {
        console.error('Error during user registration:', error);
        return false;
    }
}

module.exports = {
    attemptLogin,
    terminateSession,
    getSession,
    registerUser
};
