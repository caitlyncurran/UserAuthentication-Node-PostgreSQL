import { Strategy as LocalStrategy } from "passport-local";
import pg from "pg";
import 'dotenv/config';
import bcrypt from "bcrypt";

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: 5432,
  });
  db.connect();

export function initialize(passport) {
    const authenticateUser = async (email, password, done) => {
        try {
        const result = await db.query(`SELECT * FROM users
        WHERE email = $1`, [email]);
        console.log(result.rows);
        if (result.rows.length > 0) {
            const user = result.rows[0];

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err) {
                    throw err;
                }
                if (isMatch) {
                    return done(null, user);
                }
                else {
                    return done(null, false, {message: "Password is incorrect."});
                }
            });
        } else {
            return done(null, false, {message: "Email is not registered."});
        }
        }
        catch (err) {
            console.log(err);
        }
    }
    passport.use(new LocalStrategy({
        usernameField: "email",
        passwordField: "password"
    },
        authenticateUser
        )
    );

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
        const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
        return done(null, result.rows[0]);
        } catch (err) {
            console.log(err);
        }
    });
}