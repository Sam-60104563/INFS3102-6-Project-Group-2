// Existing imports
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { MongoClient } = require('mongodb');


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

// Function to authenticate user login(only member not admin)
async function login(username, password) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username });

        if (!user) {
            return null; 
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return null; // Incorrect password should be a message if we want
        }

        return user; // Return authenticated member if correct vakue
    } catch (err) {
        console.error("Error authenticating user:", err);
        return null;
    }
}

// Function to save a new member, I dont know if we need this function?
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

// Function to add a picture for a specific feeding site(can add admin also and memeber)
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

// Function to delete a member(we can delite this function because its not require)
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
        cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day, we can change value to be a minutes
    });
}

async function postText(memberId, text) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.updateOne(
            { _id: memberId },
            { $push: { posts: { type: 'text', content: text } } }
        );
        console.log(`Text posted by member ${memberId}`);
        return result.modifiedCount;
    } catch (err) {
        console.error("Error posting text:", err);
        return 0;
    }
}

// Function for a member to add a picture (we can use it insted of using a general one)
async function addMemberPicture(memberId, pictureUrl) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.updateOne(
            { _id: memberId },
            { $push: { posts: { type: 'picture', pictureUrl: pictureUrl } } }
        );
        console.log(`Picture added by member ${memberId}`);
        return result.modifiedCount;
    } catch (err) {
        console.error("Error adding picture:", err);
        return 0;
    }
}

// Function for a member to record details
async function recordDetails(memberId, details) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.updateOne(
            { _id: memberId },
            { $set: { details } }
        );
        console.log(`Details recorded by member ${memberId}`);
        return result.modifiedCount;
    } catch (err) {
        console.error("Error recording details:", err);
        return 0;
    }
}

// Function for a member to report health issues
async function reportHealthIssue(memberId, issue) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const result = await membersCollection.updateOne(
            { _id: memberId },
            { $push: { healthIssues: issue } }
        );
        console.log(`Health issue reported by member ${memberId}`);
        return result.modifiedCount;
    } catch (err) {
        console.error("Error reporting health issue:", err);
        return 0;
    }
}

// Close MongoDB connection
// async function closeMongoDBConnection() {
//     await client.close();
//     console.log("Disconnected from MongoDB");
// }

// Function for an admin to view dashboard
async function viewDashboard() {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const feedingSitesCollection = db.collection('feeding_sites');
        const dashboardData = {};

        // Get total number of members
        dashboardData.totalMembers = await membersCollection.countDocuments();

        // Get total number of feeding sites
        dashboardData.totalFeedingSites = await feedingSitesCollection.countDocuments();

        // Add more dashboard data as needed...

        return dashboardData;
    } catch (err) {
        console.error("Error viewing dashboard:", err);
        return null;
    }
}

// Function for an admin to view report from a specific member
async function viewMemberReport(memberId) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const member = await membersCollection.findOne({ _id: memberId });
        return member.report; // Assuming 'report' is a field in the member document containing the report
    } catch (err) {
        console.error("Error viewing member report:", err);
        return null;
    }
}

// Function for an admin to view urgent items
async function viewUrgentItems() {
    try {
        const db = client.db('stray_cat_feeding_system');
        const urgentItemsCollection = db.collection('urgent_items');
        const urgentItems = await urgentItemsCollection.find({}).toArray();
        return urgentItems;
    } catch (err) {
        console.error("Error viewing urgent items:", err);
        return null;
    }
}

// Function for an admin to view all information from a specific member
async function viewMemberInformation(memberId) {
    try {
        const db = client.db('stray_cat_feeding_system');
        const membersCollection = db.collection('members');
        const member = await membersCollection.findOne({ _id: memberId });
        return member; // Return all information of the member
    } catch (err) {
        console.error("Error viewing member information:", err);
        return null;
    }
}

module.exports = {
    connectToMongoDB,
    login,
    saveMember,
    addPicture,
    deleteMember,
    isAdmin,
    sessionMiddleware,
    postText,
    addMemberPicture,
    recordDetails,
    reportHealthIssue,
    viewDashboard,
    viewMemberReport,
    viewUrgentItems,
    viewMemberInformation
};


