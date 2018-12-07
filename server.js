const express       = require('express');
const mongoose      = require('mongoose');
const bodyParser    = require('body-parser')
const User          = require('./schema/User')
const config        = require('./config/config')
const session       = require("express-session");
const passport      = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const bcrypt        = require('bcrypt');

const app = express();

// server static files
app.use(express.static('public'));

app.set('view engine', 'pug')

app.locals.user = null;

// connect to DB
mongoose.connect(config.mongodURI, { useNewUrlParser: true } , (err) => {
    if (err)
        return console.log("error", err);
    console.log("Connected")
});

// passport init
app.use(session({
    secret: "cats",
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    function(username, password, done) {
          User.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
        let match = bcrypt.compare(password, user.password).then((match) => {
            if (!match) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        })
      });
    }
));

passport.serializeUser(function(user, done) {
    app.locals.user = user;
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())


const routes = require('./routes/route');
app.use('/', routes)

app.get("/logout", (req, res) => {
    req.logout();
    app.locals.user = null;
    res.redirect('/');
})

app.listen('5000', () => {
    console.log("running on port 5000");
})