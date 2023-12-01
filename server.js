import express from "express";
import pg from "pg";
import 'dotenv/config';
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
import { initialize as initializePassport } from "./passportConfig.js";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

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

passport.serializeUser( (user, done) => {
    done(null, user)
});

passport.deserializeUser((user, done) => {
   done (null, user)
});

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: 5432,
  });
db.connect();


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const result = await db.query("SELECT * FROM google_users WHERE id = $1", [profile.id]);

      if (result.rows.length === 0) {
        const newUser = {
          id: profile.id,
          first_name: profile.name.givenName,
          last_name: profile.name.familyName
        };

        // Insert the new user into the database
        await db.query("INSERT INTO google_users (id, first_name, last_name) VALUES ($1, $2, $3)",
          [newUser.id, newUser.first_name, newUser.last_name]);

        done(null, newUser); // Pass the user details to the done callback
      } else {
        const existingUser = result.rows[0];
        done(null, existingUser); // Pass the existing user details to the done callback
      }
    } catch (err) {
      console.log(err);
      done(err); // Pass the error to the done callback
    }
  }
));

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'profile' ] }
));

app.get('/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/users/dashboard',
        failureRedirect: '/users/login'
}));

app.get('/users/register', checkAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/users/login', checkAuthenticated, (req, res) => {
    res.render("login.ejs");
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
    const user = req.user || {}; // Use an empty object if req.user is undefined
    const displayName = user.first_name || user.name || 'User'; // Use 'User' if first_name is undefined

    res.render("dashboard.ejs", { user: displayName });
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