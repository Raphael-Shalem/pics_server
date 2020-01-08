import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import keys from './keys';
import User from '../models/user_model';

//this happens before cookie is sent to browser
passport.serializeUser((user, done) => {
  done(null, user.id);
});

//this happens after cookie is returned from browser
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  })
});

passport.use(
  new GoogleStrategy({
  //options for the Strategy
  callbackURL:'/api/auth/google/redirect',
  clientID:keys.google.clientID,
  clientSecret:keys.google.clientSecret
}, (accessToken, refreshToken, profile, done) => {
  //passport callback function
  //check if user exists
    User.findOne({ googleId: profile.id }).then((currentUser) => {
        if(currentUser){
        //console.log('user is:  '+currentUser);
        done(null,currentUser);
      } else {
        new User({
          userName: profile.displayName,
          googleId: profile.id
        }).save().then((newUser => {
          //console.log('newUser Created: '+newUser);
          done(null, newUser);
        }))
      }
    });
  })
)
