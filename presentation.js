const express = require("express");
const path = require("path");
const business = require("./business");
const cookieParser = require("cookie-parser");
const app = express();
const templatePath = path.join(__dirname, '../templates');

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'hbs');
app.set("views", templatePath);

app.get('/', async (req, res) => {
    let message = req.query.message;
    let sessionKey = req.cookies.session;
    if (sessionKey) {
        let sd = await business.getSession(sessionKey);
        if (sd) {
            let username = sd.data.username;
            return res.render('home', { username: username });
        }
    }
    return res.render('login', { message: message });
});

app.post('/', async (req, res) => {
    let username = req.body.uname;
    let password = req.body.pw;
    let session = await business.attemptLogin(username, password);
    if (session) {
        res.cookie('session', session.key, { expires: session.expiry });
        res.redirect('/home');
    } else {
        res.redirect('/?message=Invalid Credentials');
    }
});

app.get('/home', async (req, res) => {
    let sessionKey = req.cookies.session;
    if (!sessionKey) {
        return res.redirect("/?message=You must be logged in to see that page");
    }
    let sd = await business.getSession(sessionKey);
    if (!sd) {
        return res.redirect("/?message=You must be logged in to see that page");
    }
    let username = sd.data.username;
    return res.render('home', { username: username });
});

app.get("/signup", (req, res) => {
    res.render('signup');
});

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    let valid = await business.registerUser(username, password);
    if (valid) {
        res.redirect('/home');
    } else {
        res.redirect('/signup?message=Registration failed');
    }
});

app.get('/logout', async (req, res) => {
    await business.terminateSession(req.cookies.session);
    res.clearCookie('session');
    res.redirect('/');
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
