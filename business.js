const { isNullOrUndefined } = require("util");
const persistence = require("./persistence.js")
const crypto = require("crypto")
const nodemailer = require('nodemailer')
let transporter = nodemailer.createTransport({
    host:"127.0.0.1",
    port: 25
})

async function testmail(to,key){
    let body = `<a href = "http:/127.0.0.1:8000/resetLink/${key}"> Reset Link </a>`
    await transporter.sendMail({
        from : "support@PSO.com",
        to : to,
        subject : "Reset Password Link",
        html : body
    })
}


async function emailCheck(email){
    return await persistence.getEmailDetails(email)
}

async function modifyCollection(key, email){
    return await persistence.modifyCollection(key, email)
}

async function validateResetPasswordKey(key) {
    try {
    let cleanedKey = key.replace(/=/g, '');
    let user = await persistence.getUserDetailsfromKey(cleanedKey);
    return user;
    } catch (error) {
    console.error(`Error validating reset key: ${error.message}`);
    throw error;
    }
}

async function updateUserPasswordWithResetKey(key, p) {
    try {
        let cleanedKey = key.replace(/=/g, '');
        let user = await persistence.getUserDetailsfromKey(cleanedKey);
        let result = await generatePassword(p)

        user.Password = result;
        await persistence.updateCollection(user);
        return true;
    } catch (error) {
        console.error(`Error updating user password by reset key: ${error.message}`);
        throw error;
    }
}

async function uploadProfilePic(userID, filename) {
    try {
        let user = await getUser(userID)
        user.ProfilePic = filename
        await persistence.updateCollection(user);
        return true;
    } catch (error) {
        console.error(`Error updating profile picture!`);
        throw error;
    }
}

async function removeResetPasswordKey(key) {
    try {
        let cleanedkey = key.replace(/=/g, '');
        let user = await persistence.getUserDetailsfromKey(cleanedkey);
        let userUp = {
            UserId: user.UserId,
            Username: user.Username,
            Password: user.Password,
            Email: user.Email,
            data:{
                AccountType: user.data.AccountType,
                StationId: user.data.StationId
            }
        }
        await persistence.updateCollection(userUp);
    } catch (error) {
        console.error(`Error deleting reset key from users: ${error.message}`);
        throw error;
    }
}

async function checkLogin(email, password) {
    let user = await persistence.getUserbyEmail(email);
    let result = await generatePassword(password)
    if (user == undefined || user.Password != result) {
        return undefined
    }
    else {
        return user.UserId;
    
    }
}

async function getUser(uid){
    return await persistence.getUserbyID(uid)
}

async function getUsers(type){
    return await persistence.getUsers(type)
}


async function isAuthenticated(session) {
    let sd = await getSessionData(session)
    if (!session) {
        return false
    }
    if (sd && sd.data.email != "") {
        return true
    }
    return false
}

async function registerNewUser(name, email, password) {
        return await persistence.registerUser(name, email, password)
}

async function generatePassword(Password){
    var hash = crypto.createHash('sha256')
    hash.update(Password)
    let result = hash.digest('hex')
    return result
}

async function deleteUser(uid) {
    return await persistence.deleteUser(uid);
}

async function startSession(data) {
    let uuid = crypto.randomUUID();
    let expiry = new Date(Date.now() + 1000 * 60 );
    if(data.email !== "" || data.email !== null){
        expiry = new Date(Date.now() + 60000 * 60 );
    }
    await persistence.saveSession(uuid, expiry, data)
    return uuid
    }    

async function getSessionData(key) {
    return await persistence.getSessionData(key);
    }
    
async function deleteSession(key) {
    return await persistence.deleteSession(key);
    }

async function generateToken(key) {
    let token = Math.floor(Math.random()*1000000)
    let sd = await persistence.getSessionData(key)
    sd.csrfToken = token
    await persistence.updateSession(sd)
    return token
    }

async function getToken(key) {
    let sd = await persistence.getSessionData(key)
    return sd.csrfToken
    }

async function cancelToken(key) {
    let sd = await persistence.getSessionData(key)
    sd.csrfToken = token
    await persistence.updateSession(sd)
    }
    
async function updateSession(data){
    return persistence.updateSession(data)
}


async function inputData(userID, type, food, water, cats, stationId, date, time, comments, picName){
    let data = {
        UserID: userID,
        StationID: stationId,
        Date: date,
        Type: type,
        FoodAmount: food,
        WaterAmount: water,
        NumberOfCats: cats,
        Description: comments,
        Time : time,
        PictureName: picName
    }
    let station = await persistence.getStation(stationId)
    await persistence.savePost(data)
    station.RationLevels.Food += food
    station.RationLevels.Water += water
    return await persistence.editStation(stationId, station)
}

async function saveReport(userID, cats, stationId, date, time, desc, picName){
    let data = {
        UserID: userID,
        StationID: stationId,
        Date: date,
        NumberOfCats: cats,
        Description: desc,
        Time : time,
        PictureName: picName
    }
    await persistence.saveReport(data)
}


async function getStations(){
    return await persistence.getStations()
}

async function getStation(StationID){
    return await persistence.getStation(StationID)
}

async function getPosts(){
    return await persistence.getPosts()
}

async function getReports(){
    return await persistence.getReports()
}

async function updateUser(user){
    return await persistence.editUser(user)
}



async function getRationsDelData(sID){
    let FoodArray = [0,0,0,0,0,0,0,0,0,0,0,0]
    let WaterArray = [0,0,0,0,0,0,0,0,0,0,0,0]
    let data = await persistence.getRationsDelData(sID)
    let nowDate = new Date(2024, 0)
    for (let i = 0; i < 12; i++){
        for(let c of data){
            let dataDate = new Date(c.Date)
            if (dataDate.getMonth() === nowDate.getMonth() && dataDate.getFullYear() === nowDate.getFullYear()) {
                    FoodArray[i] += c.FoodAmount;
                    WaterArray[i] += c.WaterAmount;    
            }
        }
        nowDate.setMonth(nowDate.getMonth() + 1);
    }
    return [FoodArray,WaterArray]

}


async function getRationsRecData(sID){
    let FoodArray = [0,0,0,0,0,0,0,0,0,0,0,0]
    let WaterArray = [0,0,0,0,0,0,0,0,0,0,0,0]
    let data = await persistence.getRationsRecData(sID)
    let nowDate = new Date(2024, 0)
    for (let i = 0; i < 12; i++){
        for(let c of data){
            let dataDate = new Date(c.Date)
            if (dataDate.getMonth() === nowDate.getMonth() && dataDate.getFullYear() === nowDate.getFullYear()) {
                    FoodArray[i] += c.FoodAmount;
                    WaterArray[i] += c.WaterAmount;
                    
            }
        }
        nowDate.setMonth(nowDate.getMonth() + 1);
    }
    return [FoodArray,WaterArray]

}

async function RationsRecbyDate(sid, date){
    return await persistence.RationsRecbyDate(sid, date)
}

async function RationsDelbyDate(sid, date){
    return await persistence.RationsDelbyDate(sid, date)
}

async function deleteUser(uid){
    return await persistence.deleteUser(uid)
}

async function deleteStation(sid){
    return await persistence.deleteStation(sid)
}
async function registerStation(loc, food, water){
    return await persistence.registerStation(loc, food ,water )
}

module.exports = {
    checkLogin,registerNewUser, deleteUser ,startSession, getSessionData, deleteStation, testmail,
     deleteSession,isAuthenticated,generateToken,getToken,cancelToken, updateSession, getUser, 
      inputData, getRationsDelData, getRationsRecData, getStations,  getStation,
      getUsers, updateUser, RationsRecbyDate, RationsDelbyDate, registerStation,
     emailCheck, modifyCollection, validateResetPasswordKey, updateUserPasswordWithResetKey, removeResetPasswordKey,
     getPosts, generatePassword, saveReport, getReports, uploadProfilePic
}