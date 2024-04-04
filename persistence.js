const mongodb = require('mongodb');

let client = undefined;
let db = undefined;

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb+srv://60105641:Anna34@cluster0.rcprbyb.mongodb.net/');
        await client.connect();
        db = client.db('ProjectW2');
    }
}

async function getUserDetails(user) {
    await connectDatabase();
    let  users = db.collection('users');
    let  result = await users.findOne({ username: user });
    return result;
}
/*
async function getEmailDetails(email) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.findOne({ email: email });
    return result;
}
*/
async function updateUserDetails(user, newData) {
    await connectDatabase();
    let users = db.collection('users');
    let result = await users.updateOne({username: username},{password: password},{ email: email }, { $set: newData });
    console.log(result);
}

async function startSession(sessionData) {
    await connectDatabase();
    const sessionCollection = db.collection('session');
    await sessionCollection.insertOne(sessionData);
}

async function updateSession(key, data) {
    await connectDatabase();
    const sessionCollection = db.collection('session');
    await sessionCollection.replaceOne({ key: key }, data);
}

async function getSession(key) {
    await connectDatabase();
    const sessionCollection = db.collection('session');
    const result = await sessionCollection.findOne({ key: key });
    return result;
}

async function terminateSession(key) {
    await connectDatabase();
    const sessionCollection = db.collection('session');
    await sessionCollection.deleteOne({ key: key });
}

async function checkKey(resetKey) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.findOne({ resetkey: resetKey });
    return result;
}

async function updateMemberByKey(resetKey, newData) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.updateOne({ resetkey: resetKey }, { $set: newData });
    return result.modifiedCount > 0;
}

async function deleteKey(resetKey) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.updateMany({ resetkey: resetKey }, { $unset: { resetkey: "" } });
    return result.modifiedCount > 0;
}

async function deleteCSRFToken(csrfToken) {
    await connectDatabase();
    const sessionCollection = db.collection('session');
    const result = await sessionCollection.updateMany({ csrfToken: csrfToken }, { $unset: { csrfToken: "" } });
    return result.modifiedCount > 0;
}

async function getRecord(stationId) {
    await connectDatabase();
    const recordCollection = db.collection('Record');
    const result = await recordCollection.findOne({ station_id: stationId });
    return result;
}

async function getAllRecords() {
    await connectDatabase();
    const recordCollection = db.collection('Record');
    const result = await recordCollection.find({}).toArray();
    return result;
}

async function checkingRecord(recordId, recordDate) {
    await connectDatabase();
    const recordCollection = db.collection('Record');
    const result = await recordCollection.find({ record_id: recordId, record_date: recordDate }).toArray();
    return result;
}

async function submittingRecord(recordId, recordData) {
    await connectDatabase();
    const recordCollection = db.collection('Record');
    const result = await recordCollection.replaceOne({ record_id: recordId }, recordData);
    return result.modifiedCount > 0;
}

async function allMembers() {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.find({}).toArray();
    return result;
}

async function newRecord(newRecordData) {
    await connectDatabase();
    const recordCollection = db.collection('Record');
    const result = await recordCollection.insertOne(newRecordData);
    return result.insertedId;
}

async function memberByName(memberName) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.find({ name: memberName }).toArray();
    return result;
}

async function updateMember(userData) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.replaceOne({ name: userData[0].name }, userData[0]);
    return result.modifiedCount > 0;
}

async function updateUser2(userData) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.replaceOne({ username: userData.username }, userData);
    return result.modifiedCount > 0;
}

async function removeStationId(userData) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.updateOne({ 'data.record_id': userData.data.record_id }, { $unset: { 'data.station_id': "" } });
    return result.modifiedCount > 0;
}

async function newMember(newUserData) {
    await connectDatabase();
    const memberCollection = db.collection('member');
    const result = await memberCollection.insertOne(newUserData);
    return result.insertedId;
}

module.exports = {
    getUserDetails,
    getEmailDetails,
    updateMemberEmail,
    startSession,
    updateSession,
    getSession,
    terminateSession,
    checkKey,
    updateMemberByKey,
    deleteKey,
    deleteCSRFToken,
    getRecord,
    getAllRecords,
    checkingRecord,
    submittingRecord,
    allMembers,
    newRecord,
    memberByName,
    updateMember,
    updateUser2,
    removeStationId,
    newMember
};
