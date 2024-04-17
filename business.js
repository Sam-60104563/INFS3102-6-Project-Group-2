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

// async function getDeliveryDate(data){
//     await connectDatabase()
//     let collection = db.collection('Delivery')
//     let result = await collection.find({"StationID": data.StationID, "Date": data.Date }).toArray()
//     return result[0]
// }



async function getStation(StationID) {
    await connectDatabase()
    let station = db.collection('Stations')
    let result = await station.find({ "StationID": StationID }).toArray()
    return result[0]
}

async function getStations() {
    await connectDatabase()
    let station = db.collection('Stations')
    let result = await station.find().toArray()
    return result
}


async function editUser(user) {
    await connectDatabase()
    let total = db.collection('UserAccounts')
    await total.replaceOne({ UserId: user.UserId }, user)
    return true
}

async function getUserbyEmail(email) {
    await connectDatabase();
    users = db.collection('UserAccounts');
    let userDetails = await users.findOne({ Email: email });
    return userDetails;
}

async function getUserbyID(uid) {
    await connectDatabase();
    users = db.collection('UserAccounts');
    let userDetails = await users.findOne({ UserId: uid });
    return userDetails;
}

async function getUsers(type) {
    await connectDatabase();
    users = db.collection('UserAccounts');
    if(type === null || type === undefined){
        let userDetails = await users.find().toArray()
        return userDetails
    }
    let userDetails = await users.find({ "data.AccountType": type }).toArray();
    return userDetails;
}

async function registerUser(name, email, password) {
    await connectDatabase();
    regusers = db.collection('UserAccounts');
    let users = await getUsers()
    let newuid = 0
    for(let u of users){
        if(newuid < u.UserId){
            newuid = u.UserId
        }
    }
    newuid += 1
    var hash = crypto.createHash('sha256')
    hash.update(password)
    let result = hash.digest('hex')

    let reg = {
        Username: name,
        UserId: newuid,
        Password: result,
        Email: email,
        data: {
            AccountType: "member",
        }
    }
    await regusers.insertOne(reg) 
}

async function registerStation(stationLocation, food, water) {
    await connectDatabase();
    let station = db.collection('Stations');
    let stations = await getStations()
    let newsid = 0
    for(let s of stations){
        if(newsid < s.StationID){
            newsid = s.StationID
        }
    }
    newsid += 1
    let reg = {
        StationID: newsid,
        StationLocation: stationLocation,
        RationLevels: {
            Food: food,
            Water: water
        }
    }
    await station.insertOne(reg) 
}

async function deleteUser(uid) {
    await connectDatabase();
    session = db.collection('UserAccounts');
    await session.deleteOne({ UserId: +uid });
}

async function deleteStation(sid) {
    await connectDatabase();
    session = db.collection('Stations');
    await session.deleteOne({ StationID: +sid });
}


async function saveSession(uuid, expiry, data) {
    let sessionData = {
        SessionId: uuid,
        Expiry: expiry,
        data: data}
        await connectDatabase();
        session = db.collection('Sessions')
        await session.insertOne(sessionData)
}

async function getSessionData(key) {
    await connectDatabase();
    session = db.collection('Sessions');
    let sessionData = await session.findOne({ SessionId: key });
    return sessionData;
}


async function updateSession(sd) {
    await connectDatabase();
    session = db.collection('Sessions');
    await session.replaceOne({ SessionId: sd.SessionId }, sd);

}

async function deleteSession(key) {
    await connectDatabase();
    session = db.collection('Sessions');
    await session.deleteOne({ SessionId: key });
}
        
async function getRationsDelData(sID){
    await connectDatabase();
    let delivery = db.collection('Delivery')
    let data = await delivery.find({StationID: sID}).toArray();
    return data
}


async function getRationsRecData(sID){
    await connectDatabase();
    let sales = db.collection('Posts')
    let data = await sales.find({StationID: sID}).toArray();
    return data
}    

async function RationsRecbyDate(sid, date){
    await connectDatabase();
    let rec = db.collection('Posts')
    let data;
    if(date === ""){
        data = await rec.find({StationID: sid}).toArray();
    }
    else{
        data = await rec.find({StationID: sid, Date: date}).toArray();
    }
    return data
} 

async function RationsDelbyDate(sid, date){
    await connectDatabase();
    let delivery = db.collection('Delivery')
    let data;
    if(date === ""){
        data = await delivery.find({StationID: sid}).toArray();
    }
    else{
        data = await delivery.find({StationID: sid, Date: date}).toArray();
    }
    return data
} 

async function editStation(sid, station) {
    await connectDatabase()
    let total = db.collection('Stations')
    await total.replaceOne({ StationID: sid }, station)
    return true
}

module.exports = {
        getUserbyEmail, registerUser,saveSession,
         getSessionData, deleteSession,updateSession, getStation, saveDelivery, 
        getUserbyID, getRationsDelData, getRationsRecData,  savePost,  getStations,
        getUsers, editUser, RationsRecbyDate, RationsDelbyDate, deleteUser, deleteStation, registerStation,
        getEmailDetails, updateCollection, modifyCollection, getUserDetailsfromKey, editStation, getPosts,
        saveReport, getReports
}


