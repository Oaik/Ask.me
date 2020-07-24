const express       = require('express');
const router        = express.Router();
const config        = require('../config/config')
const passport      = require('passport')
const bcrypt        = require('bcrypt')

const User          = require('../schema/User')
const Post          = require('../schema/Post')

router.route('/')
    .get( (req, res) => {
        if(req.user) {
            return res.redirect("/profile/"+req.user.username)
        }
        return res.render('index')
    })

router.route('/users')
    .get((req, res) => {
        User.find({}, (err, users) => {
            console.log(users);
            res.render("users", {users: users});
        })
    })

router.route('/register')
    .get((req, res) => {
        if(req.user)
            return res.redirect("/");
        return res.render("register");
    })
    .post((req, res) => {
        req.body.username = req.body.username.toLowerCase();
        let userInfo = req.body;
        User.findOne({username: userInfo.username}, (err, user) => {
            if (err) return res.send(err)
            if (user) return res.status(404).send("this user already registerted")
            bcrypt.hash(req.body.password, config.saltRound, (err, hash) => {
                if(err) return console.log(err)
                userInfo.password = hash;
                let newUser = new User(userInfo);
                newUser.save().then(() => {
                    console.log("User Saved!!!")
                    req.login(newUser, (err) => {
                        if (err) return console.log(err);
                        res.redirect("/")
                    });
                }).catch((err) => {
                    res.send(`Error: ${err}`)
                })
            })
        })    
    })

router.route("/login")
    .get((req, res) => {
        if(req.user)
            return res.redirect("/");
        return res.render('login');
    })
    .post(passport.authenticate('local',{
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: false 
    }))

router.route("/profile/:profile/questions")
    .get((req, res) => {
        if(!req.isAuthenticated()) return res.render("profile/profile", {authErr: true});
        let profileUsername = req.user.username
        if (req.params.profile !== profileUsername) return res.redirect("/");
        Post.find({userAsked: profileUsername}, (err, post) => {
            if(err) return res.send("err from post inside profile");
            let data = post.filter((answer) => {
                return answer.questionAnswered === false
            })
            if(!data || data.length === 0) return res.render("profile/questions",{empty: true})
            res.render("profile/questions", {empty: false, data: data})
        })
    })

router.route("/profile/:profile/questions/:post")
    .get((req, res) => {
        if(!req.isAuthenticated()) return res.render("profile/profile", {authErr: true});
        let profileUsername = req.user.username
        if (req.params.profile !== profileUsername) return res.redirect("/");
        Post.findById(req.params.post, (err, post) => {
            if (err) return res.status(404).send(err);
            console.log(post);
            if (profileUsername !== post.userAsked) return res.redirect("/");
            if(post.questionAnswered)
                return res.send(post);
            res.render("profile/question", {postBody: post.body, userAsking: post.userAsking, username: profileUsername, postId: post._id})
        })
    })
    .post((req, res) => {
        if(!req.isAuthenticated()) return res.render("profile/profile", {authErr: true});
        let profileUsername = req.user.username
        if (req.params.profile !== profileUsername) return res.redirect("/");
        Post.findById(req.params.post, (err, post) => {
            if (err) return res.send(err, "ERROR");
            if (profileUsername !== post.userAsked) return res.redirect("/");
            let answerPost = post;
            answerPost.answer = req.body.answer, answerPost.questionAnswered = true;
            Post.findOneAndUpdate({_id: req.params.post}, answerPost).then((post) => {
                res.redirect('/profile/' + profileUsername + '/questions/');
            });
        })
    })
    
    
    router.route("/profile/:profile")
    .get((req, res) => {
        const profileUsername = req.params.profile;
        User.findOne({username: profileUsername}, (err, profile) => {
            if (err) return res.send("Error");
            if (!profile || profile == null) return res.send("Profile not found")
            Post.find({userAsked: profileUsername}, (err, post) => {
                if(err) return res.send("err from post inside profile");
                let data = post.filter((answer) => {
                    return answer.questionAnswered === true
                })
                numUnAnswered = post.filter((answer) => {
                    return answer.questionAnswered === false
                }).length
                res.render("profile/profile", {userProf: req.params.profile, age:profile.age, gender: profile.gender, data: data, empty: (!data || data.length === 0), postCount: data.length, numUnAnswered });
            })
        })
    })
    .post((req, res) => {
        if(!req.isAuthenticated())
            return res.render("login", {msgErr: true})
        const profileUsername = req.params.profile;
        User.findOne({username: profileUsername}, (err, profile) => {
            if (!profile || profile == null) return res.redirect("/");
            const body = req.body;
            console.log("Serv ", body);
            console.log(body.allowName);
            if(body.allowName == "on")
                body.allowName = true;
            else
                body.allowName = false;
            if(!body.allowName)
                body.userAsking = null;
            else
                body.userAsking = req.user.username;
            body.userAsked = req.params.profile;
            body.answer = null;
            console.log("Ques ", body);
            let newPost = new Post(body);
            
            newPost.save()
                .then(() => {
                    Post.find({userAsked: profileUsername}, (err, post) => {
                        if(err) return res.send("err from post inside profile");
                        let data = post.filter((answer) => {
                            return answer.questionAnswered === true
                        })
                        numUnAnswered = post.filter((answer) => {
                            return answer.questionAnswered === false
                        }).length
                        return res.render("profile/profile", {userProf: req.params.profile, age:profile.age, gender: profile.gender, data: data, empty: (!data || data.length === 0), postCount: data.length, numUnAnswered, msgDone: true });
                    })
                })
                .catch((err) => {
                    console.log(err);
                    res.status(503).send("Error");
                })
        })        
    })


module.exports = router