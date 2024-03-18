const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const uri = 'mongodb+srv://60105641:Anna34@cluster0.rcprbyb.mongodb.net/projectWeb';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const store = new MongoDBStore({
    uri: uri,
    collection: 'sessions'
});

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

// Function to save a new user (public viewer)
async function saveUser(user) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const usersCollection = db.collection('users');
        const result = await usersCollection.insertOne(user);
        console.log(`User ${result.insertedId} added successfully`);
        return result.insertedId;
    } catch (err) {
        console.error("Error saving user:", err);
        return null;
    }
}

// Function to save a new member
async function saveMember(member) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.insertOne(member);
        console.log(`Member ${result.insertedId} added successfully`);
        return result.insertedId;
    } catch (err) {
        console.error("Error saving member:", err);
        return null;
    }
}

// Function to save a new administrator
async function saveAdministrator(administrator) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const adminsCollection = db.collection('administrators');
        const result = await adminsCollection.insertOne(administrator);
        console.log(`Administrator ${result.insertedId} added successfully`);
        return result.insertedId;
    } catch (err) {
        console.error("Error saving administrator:", err);
        return null;
    }
}

// Function to add a picture for a specific feeding site
async function addPicture(feedingSiteId, pictureUrl) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const feedingSitesCollection = db.collection('feeding_sites');
        const result = await feedingSitesCollection.updateOne(
            { _id: feedingSiteId },
            { $set: { pictureUrl } }
        );
        console.log(`Picture added for feeding site ${feedingSiteId}`);
        return result.modifiedCount;
    } catch (err) {
        console.error("Error adding picture:", err);
        return 0;
    }
}

// Function to delete a user
// async function deleteUser(userId) {
//     try {
//         const db = client.db('stray_cat_feeding_system');
//         const usersCollection = db.collection('users');
//         const result = await usersCollection.deleteOne({ _id: userId });
//         console.log(`User ${userId} deleted successfully`);
//         return result.deletedCount;
//     } catch (err) {
//         console.error("Error deleting user:", err);
//         return 0;
//     }
// }

// Function to delete a member
async function deleteMember(memberId) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.deleteOne({ _id: memberId });
        console.log(`Member ${memberId} deleted successfully`);
        return result.deletedCount;
    } catch (err) {
        console.error("Error deleting member:", err);
        return 0;
    }
}

// Middleware function to check if user is authenticated as admin
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        res.status(403).send('Forbidden');
    }
}

// Middleware function to handle session and cookie
function sessionMiddleware() {
    return session({
        secret: 'your-secret-key',
        store: store,
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
    });
}

// Close MongoDB connection
async function closeMongoDBConnection() {
    await client.close();
    console.log("Disconnected from MongoDB");
}

module.exports = {
    connectToMongoDB,
    saveUser,
    saveMember,
    saveAdministrator,
    addPicture,
    deleteUser,
    deleteMember,
    isAdmin,
    sessionMiddleware,
    closeMongoDBConnection
};
