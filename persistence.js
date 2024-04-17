const mongodb = require('mongodb')
const crypto = require('crypto')
let client = undefined
let db = undefined
let users = undefined

async function connectDatabase() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb+srv://60105641:Anna34@cluster0.rcprbyb.mongodb.net/')
        await client.connect()
        db = client.db('Project');

    }
}

async function getEmailDetails(email){
    await connectDatabase()
    let users = db.collection('UserAccounts')
    let result = await users.findOne({'Email': email})
    return result
}

async function modifyCollection(key, email){
    email.ResetKey = key
    await updateCollection(email)
}

async function getUserDetailsfromKey(key) {
    await connectDatabase()
    let users = db.collection('UserAccounts')
    let result = await users.findOne({ResetKey: +key})
    return result
}

async function updateCollection(checkEmail){
    await connectDatabase()
    let users = db.collection('UserAccounts')
    let email = checkEmail.Email
    await users.replaceOne({Email : email}, checkEmail)
    return
}

async function savePost(data){
    await connectDatabase()
    let collection = db.collection('Posts')
    await collection.insertOne(data)
}

async function saveReport(data){
    await connectDatabase()
    let collection = db.collection('Reports')
    await collection.insertOne(data)
}

async function saveDelivery(data){
    await connectDatabase()
    let collection = db.collection('Delivery')
    await collection.insertOne(data)
}



async function getPosts(){
    await connectDatabase()
    let collection = db.collection('Posts')
    let result = await collection.find().toArray()
    return result
}

async function getReports(){
    await connectDatabase()
    let collection = db.collection('Reports')
    let result = await collection.find().toArray()
    return result
}

module.exports = {
};