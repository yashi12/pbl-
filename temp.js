//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const dotenv = require('dotenv');
const multer = require('multer');
const uuid = require('uuid').v4;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/upload');
  },
  filename: (req, file, cb) => {
    const {
      originalname
    } = file;
    cb(null,originalname);
  }
})
const upload = multer({
  storage: storage
});


const app = express();

app.use(express.static("public"));
app.use(express.static('public/images'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.oo1k8dw.mongodb.net/?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const studentSchema = new mongoose.Schema({
  // { typeKey: '$type' }
  name: String,
  email: String,
  password: String,
  googleId: String,
  role: String,
  stud: {
    name: String,
    rollno: String,
    assignments: [{
        assignment_id: String,
        name: String
      }],
    test: [{
        test_id: String, 
        name: String
      }]
  },
  teacher: {
    subject:{
      name: String,
      assignments: [{
        // type: String,
        name: String
      }],
      test: [{
        name: String
      }]
    }
  }
});

studentSchema.plugin(passportLocalMongoose);
studentSchema.plugin(findOrCreate);

const Student = new mongoose.model("Student", studentSchema);

passport.use(Student.createStrategy());

passport.serializeUser(function(student, done) {
  done(null, student.id);
});

passport.deserializeUser(function(id, done) {
  Student.findById(id, function(err, student) {
    done(err, student);
  });
});

// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "https://e-paathshala.herokuapp.com/auth/google/home",
//      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     // console.log(profile);

//     Student.findOrCreate({
//       username: profile.emails[0].value,
//       googleId: profile.id
//     }, function(err, student) {
//       return cb(err, student);
//     });
//   }
// ));

app.get("/", function(req, res) {
  res.render("landing");
});

app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile", "email"]
  })
);

app.get("/auth/google/home",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  async function(req, res) {
    try {

      if (!req.user.role) {
        res.redirect("/gdata");
      } else {
        res.redirect("/home");
      }
    } catch (e) {
      console.log(e);
    }

  });

app.get("/teachershome", function(req, res) {
  res.render("teachershome",{name: req.user.name});
});

app.get("/teachersdashboard", function(req, res) {
  res.render("teachersdashboard",{name: req.user.name});
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/signup", function(req, res) {
  res.render("signup");
});

app.get("/landing", function(req, res) {
  res.render("landing");
});
//passport has isAuthenticate() through which we can check wether user is logged in or not
app.get("/home", function(req, res) {
      if (req.isAuthenticated()) {
        Student.findById( req.user.id , function(err, docs) {
            if (err) {
              console.log(err);
            } else {
              if(docs.role === "Teacher"){
                res.redirect("/teachershome");
              }else{
                res.render("home",{name: req.user.stud.name});
              }
            }
          });}
           else {
            res.redirect("/landing");
          }


      });

    app.get("/dashboard", function(req, res) {
      if (req.isAuthenticated()) {
        res.render("dashboard",{name: req.user.name});
      } else {
        res.redirect("/landing");
      }
    });

    app.get("/gdata", function(req, res) {
      res.render("gdata");

    });

    app.get("/studentUpload", function(req, res) {
        res.render("studentUpload",{name:"yashi"});
  
      });

    app.get("/logout", function(req, res) {
      req.logout();
      res.redirect("/landing");
    });

    app.post("/signup", function(req, res) {

      if (req.body.role === "Teacher") {
        Student.register({
          name: req.body.name,
          username: req.body.username,
          role: req.body.role,
          teacher: {
            subject:{
              name: req.body.subject
            }
          }
        }, req.body.password, function(err, student) {
          if (err) {
            console.log(err);
            res.redirect("/signup");
          } else {

            passport.authenticate("local")(req, res, function() {
              res.redirect("/home");
            });
          }
        });

      } else {
        Student.register({
          username: req.body.username,
          role: req.body.role,
          stud: {
            name: req.body.name
          }
        }, req.body.password, function(err, student) {
          if (err) {
            console.log(err);
            res.redirect("/signup");
          } else {

            passport.authenticate("local")(req, res, function() {
              res.redirect("/home");
            });
          }
        });

      }

    });



    app.post("/login", function(req, res) {

      const student = new Student({
        username: req.body.username,
        password: req.body.password
      });

      req.login(student, function(err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/home");
          });
        }
      });

    });

    app.post("/gdata", function(req, res) {
      Student.updateOne({
        _id: req.user.id
      }, {
        $set: {
          role: req.body.role,
          name: req.body.name,
          "teacher.subject.name":req.body.subject
        }
      }).catch(
        error => {
          console.log(error);
        }

      );
      res.redirect("/home");
    }); 
    
    app.post('/uploadassteacher', upload.single('file_upload'), (req, res) => {
      // { $push: { friends: objFriends  } },
      // {new: true, useFindAndModify: false})
      // ,{useFindAndModify: false}
      console.log(req.file.filename);
      console.log(req.user.id);

      console.log(req.user.teacher.subject.name);
      // const update= { $push: {teacher:{subject: {assignments: req.file.filename}}} };
        // const update= {"teacher":{"subject":{$push: "assignments": req.file.filename} } };
        const update= {$push:{"teacher.subject.assignments": {name: req.file.filename}} }
        console.log(update);
         Student.findOneAndUpdate({_id: req.user.id},update,function(err){
           console.log(err);
         });
          res.redirect("/teachersdashboard");
       });

       app.post('/upload_assign_student', upload.single('file_upload'), (req, res) => {
        // { $push: { friends: objFriends  } },
        // {new: true, useFindAndModify: false})
        // ,{useFindAndModify: false}
        console.log(req.file.filename);
        console.log(req.user.id);
  
        console.log(req.user.stud.name);
        const enroll  = req.user.stud.rollno;
        // const update= { $push: {teacher:{subject: {assignments: req.file.filename}}} };
          // const update= {"teacher":{"subject":{$push: "assignments": req.file.filename} } };
          const update= {$push:{"stud.assignments": {name: req.file.filename}} }
          console.log(update);
           Student.findOneAndUpdate({_id: req.user.id},update,function(err){
             console.log(err);
           });
            res.redirect("/studentUpload");
         });

       app.post('/uploadtestteacher', upload.single('avatar'), (req, res) => {
         // { $push: { friends: objFriends  } },
         // {new: true, useFindAndModify: false})
         // ,{useFindAndModify: false}
         console.log(req.file.filename);
         console.log(req.user.id);

         console.log(req.user.teacher.subject.name);

           const update= {$push:{"teacher.subject.test": {name: req.file.filename}} }
           console.log(update);
            Student.findOneAndUpdate({_id: req.user.id},update,function(err){
              console.log(err);
            });
             res.redirect("/teachersdashboard");
          });

          app.post('/upload_test_student', upload.single('avatar'), (req, res) => {
          // { $push: { friends: objFriends  } },
          // {new: true, useFindAndModify: false})
          // ,{useFindAndModify: false}
          console.log(req.file.filename);
          console.log(req.user.id);
  
          console.log(req.user.teacher.subject.name);
  
            const update= {$push:{"stud.test": {name: req.file.filename}} }
            console.log(update);
              Student.findOneAndUpdate({_id: req.user.id},update,function(err){
                console.log(err);
              });
              res.redirect("/studentUpload");
            });

    app.post("/subject",function(req,res){
      var subject = req.body.sub;
      Student.find({"teacher.subject.name": subject},function(err, ans){
        if(err){
          console.log(err);
        }else{
          res.render("selectteacher",{subject: subject, tnames: ans,name:req.user.stud.name});
        }
      })

    })

    app.post("/teacher",function(req,res){
      var subject=req.body.sub;
      Student.findOne({name: req.body.tname, "teacher.subject.name": subject},function(err, ans){
        if(err){
          console.log(err);
        }else{
          res.render("dashboard",{subject:subject, assignments: ans.teacher.subject.assignments, tests: ans.teacher.subject.test , name:req.user.stud.name});
          console.log(ans);
        }
      })
    })

    app.listen(process.env.PORT || 3000, function() {
      console.log("Server started on port 3000.");
    });
