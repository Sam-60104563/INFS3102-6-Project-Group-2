const express = require('express')
const business = require('./business.js')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const flash = require('./flash.js')
const upload = require('./upload.js');

let app = express()
const handlebars = require('express-handlebars')
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(urlencodedParser)
app.use(cookieParser())
app.use(express.static(__dirname + '/dist/static'));
app.use('/images', express.static(__dirname+"images"))

//Login

app.get('/', async (req, res) => {
    let key = req.cookies.session
    let msg = await flash.getFlash(key)
    if(!msg){
        msg = "Sign In to your account"
    }
    let sd = undefined
    if (key) {
        sd = await business.getSessionData(key)
    }
    if(sd && sd.data.Email){
        sd.Expiry = new Date(Date.now() + 60000 * 60 );
        await business.updateSession(sd)
        if(sd.data.AccountType == "member"){
            res.redirect('/stationsList')
            return
        }
        else if(sd.data.AccountType == "admin"){
            res.redirect('/adminHome')
            return
        }
    }
        await business.deleteSession(key)
        res.clearCookie('session')
        res.render('login', {
            layout: undefined,
            message: msg
    })
})

app.use('/', bodyParser.urlencoded({extended:false}))
app.post('/', async (req, res) => {
    let email = req.body.email
    let password = req.body.pw
    let user = await business.checkLogin(email, password)
    if(!user){
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Invalid Credentials")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let acType = await business.getUser(user)
    acType = acType.data.AccountType
    let key = await business.startSession({Email: email, UserId: user, AccountType: acType})
    res.cookie('session', key)
    res.redirect('/')
})


//Guest functionalities

app.get('/public', async (req,res) => {
    res.redirect('/publicHome')
})

app.get('/publicHome', async (req,res) => {
    res.render('publicHome', {
        layout: 'public',
    })
})

app.get('/stationsList', async (req,res) => {
    let layout = "public"
    let key = req.cookies.session
    let user
    if(key){
        let sd = await business.getSessionData(key)
        if(sd){
            layout = sd.data.AccountType
            user = await business.getUser(sd.data.UserId)
        }
    }
    let list = await business.getStations()
    for(let item of list){
        if(item.RationLevels.Food < 500 && item.RationLevels.Water < 500){
            item.message = "Both Food & Water amount is Low"
        }
        else if(item.RationLevels.Food < 500){
            item.message = "Food quantity is Low"
        }
        else if(item.RationLevels.Water < 500){
            item.message = "Water quantity is Low"
        }
    }
    res.render('stationsList', {
        layout: layout,
        stations: list,
        name: "Stations List ",
        details : user
    })
})

app.get('/contactUs', async (req,res) => {
    res.render('contactUs', {
        layout: 'public',
        name: "Contact Us",
    })
})

app.get('/registerUser', async (req, res) => {
    let key = req.cookies.session
    let msg =await flash.getFlash(key)
    if(!msg){
        msg = "Create user account"
    }
    res.render('register', {
        layout: null,
        message: msg
    })
})
app.use('/registerUser', bodyParser.urlencoded({extended:false}))
app.post('/registerUser', async (req, res) => {
    let name = req.body.name
    let email = req.body.email
    let password = req.body.password
    if(name === "" || email === "" || password === ""){
        await flash.setFlash(key, "Please input all data!")
        res.cookie('session', key)
        res.redirect('/registerUser')
        return
    }
    else{
        await business.registerNewUser(name, email, password)
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "User Registered Successfully")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
  
})


//logout
app.get('/logout', async(req,res)=>{
    let key = req.cookies.session
    let del = await business.getSessionData(key)  
    if(del){
        await business.deleteSession(key)
    }
    if(key){
        res.clearCookie(key)
    }
    let key1 = await business.startSession({Email:""})
    await flash.setFlash(key1, "Logged out!")
    res.cookie('session', key1)
    res.redirect('/')
    return
})


//reset Password

app.get('/resetPassword', async(req,res)=>{
    res.render('resetPassword1', {
        layout: undefined
    })
})

app.post('/resetPassword', async(req,res)=>{
    let email = req.body.email
    let checkEmail = await business.emailCheck(email)
    if(checkEmail){
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Email sent!")
        res.cookie('session', key)
        key = await business.generateToken(key)
        await business.modifyCollection(key, checkEmail)
        await business.testmail(email, key)
        console.log(email)
        console.log(key)
        res.redirect('/')
    }
    else{
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "No email was found!")
        res.cookie('session', key)
        res.redirect('/')
    }
})

app.get('/resetLink/:key', async(req,res)=>{
    let key = req.params.key
    let sess = req.cookies.session
    let user = await business.validateResetPasswordKey(key)
    let msg = await flash.getFlash(sess)
    if(!msg){
        msg = 'Please enter your new password'
    }
    else{
        await flash.deleteFlash(sess)
    }
    await business.deleteSession(sess)
    if (user){
        res.render('resetPassword',{layout: undefined, message: msg, key : key})
    }
    else{
        res.redirect("/?message=Error while reseting the password please try again")
    }
})


app.post('/reset-password/:key', async (req, res) => {
    let key = req.params.key
    let newPassword = req.body.p1
    let confirmNewPassword = req.body.p2
  
    if (newPassword != confirmNewPassword){
        let sess = await business.startSession({Email:""})
        await flash.setFlash(sess, "Passwords do not match!")
        res.cookie('session', sess)
        return res.redirect(`/resetLink/${key}`)
    }else{
        let result = await business.updateUserPasswordWithResetKey(key,newPassword)
        if(result){
            await business.removeResetPasswordKey(key)
            res.redirect('/?message=Password has been changed!')
        }
    }
  })




// Admin user functionalities
app.get('/adminHome', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        let stations = await business.getStations()
        let user = await business.getUser(sess.data.UserId)
        if(sess){
            res.render('admin-dashboard', {
                layout: 'admin',
                name: "Dashboard",
                stations: stations,
                details : user
            })
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({Email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.post('/adminHome', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        let stations = await business.getStations()
        if(sess){
            let sid = req.body.stationId
            let user = await business.getUser(sess.data.UserId)
            let data1 = await business.getRationsDelData(+sid)
            let data2 = await business.getRationsRecData(+sid)
            let FoodArray1 = data1[0]
            let WaterArray1 = data1[1]
            let FoodArray2 = data2[0]
            let WaterArray2 = data2[1]
            res.render('admin-dashboard', {
                name: "Dashboard",
                FoodArray1: FoodArray1,
                WaterArray1: WaterArray1,
                FoodArray2: FoodArray2,
                WaterArray2: WaterArray2,
                layout: 'admin',
                stations: stations,
                details : user
            })
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        res.clearCookie(key)
        let key1 = await business.startSession({Email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.get('/profilea', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let user = sess.data.UserId
            let layout = sess.data.AccountType
            let udetails = await business.getUser(user)
            let msg = await flash.getFlash(key)
            await flash.deleteFlash(key)
            res.render('profilea', {
                layout: layout,
                details: udetails,
                name: "User Profile",
                message: msg
            })
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.get('/update-profilea', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let user = sess.data.UserId
            let layout = sess.data.AccountType
            let udetails = await business.getUser(user)
            let csrfToken = await business.generateToken(key)
            let msg = await flash.getFlash(key)
            await flash.deleteFlash(key)
            res.render('updateProfilea', {
                layout: layout,
                details: udetails,
                name: "Update Profile",
                csrfToken: csrfToken,
                message: msg
            })
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.post('/update-profilea', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let user = req.body.userId
            let name = req.body.name
            let email = req.body.email
            let password = req.body.password
            let csrfToken = req.body.csrf
            let token = await business.getToken(key)
            if (token != csrfToken) {
                res.status(403)
                res.send("Invalid CSRF Request")
                return
            }
            if(user && name && email && password && csrfToken){
                let oldUser = await business.getUser(sess.data.UserId)
                let newUser = await business.getUser(+user)
                newUser.Username = name
                newUser.Email = email
                let layout = sess.data.AccountType
                let pass = await business.generatePassword(password)
                if(pass === oldUser.Password){
                    newUser.Password = pass
                }
                else{
                    await flash.setFlash(key, "Error updating details!")
                    res.redirect('update-profilea')
                    return
                }
                await business.updateUser(newUser)
                await flash.setFlash(key, "Account details updated successfully!")
                res.render('profilea', {
                    layout: layout,
                    details: newUser,
                    name: "User Profile"
                })
            }
            else{
                await flash.setFlash(key, "Please input complete details!")
                res.redirect('update-profilea')
            }
            
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})



app.get('/update-passworda', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let user = sess.data.UserId
            let layout = sess.data.AccountType
            let udetails = await business.getUser(user)
            let csrfToken = await business.generateToken(key)
            let msg = await flash.getFlash(key)
            await flash.deleteFlash(key)
            res.render('updatePassworda', {
                layout: layout,
                details: udetails,
                name: "Update Password",
                csrfToken: csrfToken,
                message: msg
            })
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.post('/update-passworda', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let npassword = req.body.npassword
            let cnpassword = req.body.cnpassword
            let password = req.body.password
            let csrfToken = req.body.csrf
            let email = req.body.email
            let token = await business.getToken(key)
            if (token != csrfToken) {
                res.status(403)
                res.send("Invalid CSRF Request")
                return
            }
            if(cnpassword && npassword && password && csrfToken){
                if(npassword === cnpassword){
                    let user = req.body.userId
                    let name = req.body.name
                    let oldUser = await business.getUser(sess.data.UserId)
                    let newUser = await business.getUser(+user)
                    newUser.Username = name
                    newUser.Email = email
                    let layout = sess.data.AccountType
                    let pass = await business.generatePassword(password)
                    if(pass === oldUser.Password){
                        newUser.Password = await business.generatePassword(npassword)
                    }
                    else{
                        await flash.setFlash(key, "Error updating details!")
                        res.redirect('update-passworda')
                        return
                    }
                    await business.updateUser(newUser)
                    await flash.setFlash(key, "Account details updated successfully!")
                    res.render('profilea', {
                        layout: layout,
                        details: newUser,
                        name: "User Profile"
                    })
                }
                else{
                    await flash.setFlash(key, "Please input correct details!")
                    res.redirect('update-passworda')
                }
                
            }
            else{
                await flash.setFlash(key, "Please input correct details!")
                res.redirect('update-passworda')
            }
            
        }
        else{
            res.clearCookie(key)
            let key1 = await business.startSession({Email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})



app.get('/manage-stations', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let message = await flash.getFlash(key)
    await flash.deleteFlash(key)
    let stations = await business.getStations()
    let sess = await business.getSessionData(key)
    let user = await business.getUser(sess.data.UserId)
    res.render('manageStations', {
        message: message,
        stations: stations,
        name: "Manage Stations",
        layout: "admin",
        details : user
    })
})

app.get('/delete-station/:stationId', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let sid = req.params.stationId
            await business.deleteStation(sid)
            await flash.setFlash(key, "Station Deleted Successfully")
            res.redirect('/manage-stations')
        }
    }
})


app.get('/registerStation', async (req, res) => {
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let msg =await flash.getFlash(key)
    if(!msg){
        msg = "Add new Station"
    }
    let csrfToken = await business.generateToken(key)
    let sess = await business.getSessionData(key)
    let user = await business.getUser(sess.data.UserId)
    res.render('registerStation', {
        layout: 'admin',
        message: msg,
        csrfToken: csrfToken,
        details : user
    })
})
app.use('/registerStation', bodyParser.urlencoded({extended:false}))
app.post('/registerStation', async (req, res) => {
    let loc = req.body.location
    let food = req.body.food
    let water = req.body.water
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key || !athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let csrfToken = req.body.csrf
    let token = await business.getToken(key)
    if (token != csrfToken) {
        res.status(403)
        res.send("Invalid CSRF Request")
        return
    }
    if(loc === "" || food === ""|| water === ""){
        await flash.setFlash(key, "Please input all data!")
        res.cookie('session', key)
        res.redirect('/registerStation')
        return
    }
    else{
        await business.registerStation(loc,food , water)
        await flash.setFlash(key, "Station Registered Successfully")
        res.redirect('/manage-stations')
    }
  
})

app.get('/manage-records', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let stations = await business.getStations()
    let sess = await business.getSessionData(key)
    let user = await business.getUser(sess.data.UserId)
    res.render('manageRecords',{
        stations: stations,
        layout: 'admin',
    details : user})
})

app.post('/manage-records', async(req,res) =>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let date = req.body.date
            let station = req.body.stationId
            let user = await business.getUser(sess.data.UserId)
            let RationsRec = await business.RationsRecbyDate(+station, date)
            let RationsDel = await business.RationsDelbyDate(+station, date)
            let stations = await business.getStations()
            res.render('manageRecords', {
                layout: 'admin',
                RationsRec: RationsRec,
                RationsDel: RationsDel,
                date: date,
                name: "Search Records",
                stations: stations,
                details : user
            })
        }
        else{
            let key1 = await business.startSession({email:""})
            await flash.setFlash(key1, "Please log in!")
            res.cookie('session', key1)
            res.redirect('/')
            return
        }
    }
    else{
        let key1 = await business.startSession({email:""})
        await flash.setFlash(key1, "Please log in!")
        res.cookie('session', key1)
        res.redirect('/')
        return
    }
})

app.get('/manage-users', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let message = await flash.getFlash(key)
    let members = await business.getUsers('member')
    await flash.deleteFlash(key)
    let sess = await business.getSessionData(key)
    let user = await business.getUser(sess.data.UserId)
    res.render('manageUsers', {
        message: message,
        members: members,
        name: "Manage Users",
        layout: "admin",
        details : user
    })
})

app.get('/delete-user/:userId', async(req,res)=>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let uid = req.params.userId
            await business.deleteUser(uid)
            await flash.setFlash(key, "User Deleted Successfully")
            res.redirect('/manage-users')
        }
    }
})


//Uploading posts uploaded for member and admin

app.get('/posts', async(req,res)=>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let csrfToken = await business.generateToken(key)
    let sd = await business.getSessionData(key)
    let user = await business.getUser(sd.data.UserId)
    let layout = sd.data.AccountType
    let render
    if(layout === "member"){
        render = "postsMember"
    }
    else{
        render = "posts"
    }
    let stations = await business.getStations()
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1; 
    var yyyy = today.getFullYear();
    

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    today = yyyy + '-' + mm + '-' + dd;
    let msg = await flash.getFlash(key)
    await flash.deleteFlash(key)
    res.render(render, {
        csrfToken: csrfToken,
        details: user,
        today: today,
        message: msg,
        name: "Posts",
        stations: stations,
        layout: layout
    })
})





app.post('/posts', upload.single('file'), async (req, res) => {
    const fileName = req.file;
    let filename
    if (fileName) {
        filename = fileName.filename;
    }
    let date_time = new Date();
    let hours = date_time.getHours();
    let minutes = date_time.getMinutes();
    let seconds = date_time.getMilliseconds();
    let time = hours + ":" + minutes + ":" + seconds
    let type = req.body.type
    let food = Number(req.body.food)
    let water = Number(req.body.water)
    let cats = Number(req.body.cats)
    let stationId = Number(req.body.stationId)
    const date = req.body.date
    let comments = req.body.comments
    let key = req.cookies.session
    let token = await business.getToken(key)
    if (token != req.body.csrf) {
        res.status(403)
        res.send("Invalid CSRF Request")

        return
    }
    if(type && food && water && cats && stationId && date){
        let sd = await business.getSessionData(key)
        let userID = sd.data.UserId
        let result = await business.inputData(userID, type, food, water, cats, stationId, date, time, comments, filename)
        if (result === undefined){
            await flash.setFlash(key, "Post could not be uploaded!")
            res.redirect('/posts')
            
        }
        else{
            await flash.setFlash(key, "Post uploaded!")
            res.redirect('/posts')
        }
    }
    else{
        await flash.setFlash(key, "Please enter the complete data!")
        res.redirect('/posts')
    }  
});

//Viewing posts for both admin and member


app.get('/view-posts', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let sd = await business.getSessionData(key)
    let layout = sd.data.AccountType
    let posts = await business.getPosts()
    let stationName
    let userdet = await business.getUser(sd.data.UserId)
    let user
    let posts1 = []
    for (let p of posts){
        if(p.Type === "normal"){
            stationName = await business.getStation(p.StationID)
            user = await business.getUser(p.UserID)
            p.StationName = stationName.StationLocation
            p.Username = user.Username
            posts1.push(p)
        }
    }
    res.render('viewPosts',{
        posts: posts1,
        layout: layout,
        details : userdet})
})


app.get('/view-urgent', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let sd = await business.getSessionData(key)
    let layout = sd.data.AccountType
    let posts = await business.getPosts()
    let stationName
    let userdet = await business.getUser(sd.data.UserId)
    let user
    let posts1 = []
    for (let p of posts){
        if(p.Type === "urgent"){
            stationName = await business.getStation(p.StationID)
            user = await business.getUser(p.UserID)
            p.StationName = stationName.StationLocation
            p.Username = user.Username
            posts1.push(p)
        }
    }
    res.render('viewPosts',{
        posts: posts1,
        layout: layout,
        details : userdet})
})


//Uploading reports for members

app.get('/reports', async(req,res)=>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let csrfToken = await business.generateToken(key)
    let sd = await business.getSessionData(key)
    let user = await business.getUser(sd.data.UserId)
    let stations = await business.getStations()
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1; 
    var yyyy = today.getFullYear();
    

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    today = yyyy + '-' + mm + '-' + dd;
    let msg = await flash.getFlash(key)
    await flash.deleteFlash(key)
    res.render('report', {
        csrfToken: csrfToken,
        details: user,
        today: today,
        message: msg,
        name: "Report",
        stations: stations,
        layout: 'member'
    })
})





app.post('/reports', upload.single('file'), async (req, res) => {
    const fileName = req.file.filename;
    let date_time = new Date();
    let hours = date_time.getHours();
    let minutes = date_time.getMinutes();
    let seconds = date_time.getMilliseconds();
    let time = hours + ":" + minutes + ":" + seconds
    let cats = Number(req.body.cats)
    let stationId = Number(req.body.stationId)
    const date = req.body.date
    let desc = req.body.desc
    let key = req.cookies.session
    let token = await business.getToken(key)
    if (token != req.body.csrf) {
        res.status(403)
        res.send("Invalid CSRF Request")

        return
    }
    if(desc && cats && stationId && date && time){
        let sd = await business.getSessionData(key)
        let userID = sd.data.UserId
        await business.saveReport(userID, cats, stationId, date, time, desc, fileName)
            await flash.setFlash(key, "Report uploaded!")
            res.redirect('/reports')
    }
    else{
        await flash.setFlash(key, "Please enter the complete data!")
        res.redirect('/reports')
    }  
});

//View Reports for Admin

app.get('/view-reports', async(req,res) =>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let sess = await business.getSessionData(key)
    let userdet = await business.getUser(sess.data.UserId)
    let reports = await business.getReports()
    for (let r of reports){
        stationName = await business.getStation(r.StationID)
        user = await business.getUser(r.UserID)
        r.StationName = stationName.StationLocation
        r.Username = user.Username
    }
    res.render('viewReports',{
        reports: reports,
        layout: 'admin',
        details : userdet})
})


//Uploading/Updating Profile Picture

app.get('/update-profile-pic', async(req,res)=>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let csrfToken = await business.generateToken(key)
    let sd = await business.getSessionData(key)
    let user = await business.getUser(sd.data.UserId)
    let layout = sd.data.AccountType
    
    let msg = await flash.getFlash(key)
    await flash.deleteFlash(key)
    res.render('updateProfilePic', {
        csrfToken: csrfToken,
        details: user,
        message: msg,
        name: "Posts",
        layout: layout
    })
})





app.post('/update-profile-pic', upload.single('file'), async (req, res) => {
    const fileName = req.file.filename;

    let key = req.cookies.session
    let token = await business.getToken(key)
    if (token != req.body.csrf) {
        res.status(403)
        res.send("Invalid CSRF Request")

        return
    }
        let sd = await business.getSessionData(key)
        let userID = sd.data.UserId
        await business.uploadProfilePic(userID, fileName)
        await flash.setFlash(key, "Profile Picture uploaded!")
        res.redirect('/profilea')
});


app.get('/rations-used', async(req,res)=>{
    let key = req.cookies.session
    let athuntic = await business.isAuthenticated(key)
    if (!key ||!athuntic) {
        let key = await business.startSession({Email:""})
        await flash.setFlash(key, "Please Login")
        res.cookie('session', key)
        res.redirect('/')
        return
    }
    let csrfToken = await business.generateToken(key)
    let sd = await business.getSessionData(key)
    let user = await business.getUser(sd.data.UserId)
    let stations = await business.getStations()
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1; 
    var yyyy = today.getFullYear();
    

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    today = yyyy + '-' + mm + '-' + dd;
    let msg = await flash.getFlash(key)
    await flash.deleteFlash(key)
    res.render('rationsUsed', {
        csrfToken: csrfToken,
        details: user,
        today: today,
        message: msg,
        name: "Posts",
        stations: stations,
        layout: 'admin'
    })
})





app.post('/rations-used', async (req, res) => {
    let food = Number(req.body.food)
    let water = Number(req.body.water)
    let stationId = Number(req.body.stationId)
    const date = req.body.date
    let key = req.cookies.session
    let token = await business.getToken(key)
    if (token != req.body.csrf) {
        res.status(403)
        res.send("Invalid CSRF Request")

        return
    }
    if(food && water && stationId && date){
        let sd = await business.getSessionData(key)
        let userID = sd.data.UserId
        await business.saveDelivery(userID, food, water, stationId, date)
        await flash.setFlash(key, "Update uploaded!")
        res.redirect('/rations-used')
    }
    else{
        await flash.setFlash(key, "Please enter the complete data!")
        res.redirect('/rations-used')
    }  
});

app.listen(8000, () => { console.log("Running")})