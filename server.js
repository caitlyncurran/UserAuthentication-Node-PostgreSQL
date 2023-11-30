import express from "express";
import pg from "pg";
import 'dotenv/config';
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
import { initialize as initializePassport } from "./passportConfig.js";

initializePassport(passport);

const app = express();
const port = 3000;

app.set('view engine', 'ejs'); 
/* I needed this line of code above because I kept getting thrown an error-
Error: No default engine was specified and no extension was provided
*/

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: 5432,
  });
  db.connect();

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get('/users/register', checkAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/users/login', checkAuthenticated, (req, res) => {
    res.render("login.ejs");
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
    res.render("dashboard.ejs", {user: req.user.name});
});

app.get("/users/logout", (req, res)=> {
    // new syntax for req.logOut below. the one in the video seems to be outdated
    req.logOut(function(err) {
        if (err) {return next(err);}
        req.flash('success_msg', "Successfully logged out.");
        res.redirect("/users/login");
    });
});

app.post('/users/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields."});
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters."});
    }

    if (password != password2) {
        errors.push({ message: "Passwords do not match."});
    }

    if(errors.length > 0) {
        res.render("register",{errors});
    } else {
        // Form validation has passed

        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        try {
        const result = await db.query(`SELECT * FROM users
        WHERE email = $1`, [email]);
        console.log(result.rows);
        
            if (result.rows.length > 0) {
            errors.push({message: "Email already registered."});
            res.render("register", {errors});
            } else {
                const result = await db.query(`INSERT INTO users (name, email, password)
                VALUES ($1, $2, $3)
                RETURNING id, password`, [name, email, hashedPassword]);
                console.log(result.rows);
                req.flash("success_msg", "You are now registered!");
                res.redirect("/users/login");
            }

        }  catch (err) {
            console.log(err);
        }
    }
});

app.post('/users/login', passport.authenticate('local', {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login", 
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/users/dashboard');
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/users/login');
}

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});