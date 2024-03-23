const express = require("express");
const path = require("path");
// const business = require("./business");
const cookieParser = require("cookie-parser");


const app = express();

const templatePath = path.join(__dirname, '../template');

app.use(express.urlencoded({ extended: false}));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'hbs');
app.set("views", templatePath);

app.get("/home", (req, res) => {
    res.render('home');
});

app.get("/", (req, res) => {
    res.render('login');
});

app.get("/signup", (req, res) => {
    res.render('signup');
});

app.get("/user", (req, res) => {
    res.render('user');
});

app.get("/member", (req, res) => {
    res.render('member');
});
app.get("/admin", (req, res) => {
    res.render('admin');
});

app.get('/logout', async (req, res) => {
    let key = req.cookies.session;
    business.terminateSession(key);
    res.clearCookie('session'); 
    res.redirect('/?message=Logged out');
});


const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});