# UserAuthentication-Node-PostgreSQL
Implementing User Authentication With Node JS and PostgreSQL

Followed this life saving video: https://www.youtube.com/watch?v=vxu1RrR0vbw&ab_channel=ConorBailey
& added Google OAuth, which was not covered in the video.

Authentication libraries used:

**bcrypt** - To hash user password to make them secure

**express-session** - To store session details in a session cookie object

**express-flash** - To display flash messages to the user

**passport** - To authenticate users

**passport-local** - To implement a local authentication strategy for our application

**dotenv** - To allow environment variables to be loaded into a .env file

**passport-google-oauth2** - To authenticate users with Google using OAuth 2.0


If you're from udemy, let me know if this helps. It's not perfect, but it's the closest to Angela's content that I could find. I tried to change unfamiliar syntax from the video into stuff we already learned in previous modules. It's still pretty involved (actually really difficult lol), so I am still hoping that Angela updates the Authentication module soon. Until then, this will just have to do...
