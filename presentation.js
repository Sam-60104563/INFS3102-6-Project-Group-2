const express = require('express')
const business = require('./business.js')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const flash = require('./flash.js')

let app = express()
const handlebars = require('express-handlebars')
app.set('views', __dirname+"/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(urlencodedParser)
app.use(cookieParser())
app.use(express.static(__dirname + '/dist/static'));

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
            res.redirect('/memberHome')
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
        layout: 'public',
        stations: list,
        name: "Stations List ",
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
        if(sess){
            res.render('admin-dashboard', {
                layout: 'admin',
                name: "Dashboard",
                stations: stations
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
                stations: stations
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
            let udetails = await business.getUser(user)
            let msg = await flash.getFlash(key)
            await flash.deleteFlash(key)
            res.render('profilea', {
                layout: 'admin',
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
            let udetails = await business.getUser(user)
            let csrfToken = await business.generateToken(key)
            let msg = await flash.getFlash(key)
            await flash.deleteFlash(key)
            res.render('updateProfilea', {
                layout: 'admin',
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
                let newUser = await business.getUser(+user)
                newUser.Username = name
                newUser.Email = email
                newUser.Password = password
                await business.updateUser(newUser)
                await flash.setFlash(key, "Account details updated successfully!")
                res.render('profilea', {
                    layout: 'admin',
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
    res.render('manageStations', {
        message: message,
        stations: stations,
        name: "Manage Stations",
        layout: "admin"
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
    let msg =await flash.getFlash(key)
    if(!msg){
        msg = "Add new Station"
    }
    let csrfToken = await business.generateToken(key)
    res.render('registerStation', {
        layout: 'admin',
        message: msg,
        csrfToken: csrfToken
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
    let stations = await business.getStations()
    res.render('manageRecords',{
        stations: stations,
        layout: 'admin'})
})

app.post('/manage-records', async(req,res) =>{
    let key = req.cookies.session 
    if(key){
        let sess = await business.getSessionData(key) 
        if(sess){
            let date = req.body.date
            let station = req.body.stationId
            let RationsRec = await business.RationsRecbyDate(+station, date)
            let RationsDel = await business.RationsDelbyDate(+station, date)
            let stations = await business.getStations()
            res.render('manageRecords', {
                layout: 'admin',
                RationsRec: RationsRec,
                RationsDel: RationsDel,
                date: date,
                name: "Search Records",
                stations: stations
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
    res.render('manageUsers', {
        message: message,
        members: members,
        name: "Manage Users",
        layout: "admin"
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
    res.render('posts', {
        csrfToken: csrfToken,
        details: user,
        today: today,
        message: msg,
        name: "Posts",
        stations: stations,
        layout: "admin"
    })
})





app.post('/posts', async (req, res) => {
    let type = req.body.type
    let amount = Number(req.body.amount)
    let action = req.body.action
    let stationId = Number(req.body.stationId)
    const date = req.body.date
    let key = req.cookies.session
    let token = await business.getToken(key)
    if (token != req.body.csrf) {
        res.status(403)
        res.send("Invalid CSRF Request")

        return
    }
    if(type && amount && action && stationId && date){
        let result = await business.inputData(type, amount, action, stationId, date)
        if (result === undefined){
            await flash.setFlash(key, "Sale amount exceeding reserves!")
            res.redirect('/posts')
            
        }
        else if(result === true){
            await flash.setFlash(key, "Sale Data Overwritten!")
            res.redirect('/posts')   
        }
        else{
            await flash.setFlash(key, "Sale Data Entered!")
            res.redirect('/posts')
        }
    }
    else{
        await flash.setFlash(key, "Please enter the complete data!")
        res.redirect('/posts')
    }  
});






app.listen(8000, () => { console.log("Running")})