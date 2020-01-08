/*import express from 'express';
import passport from 'passport';
import passportSetup from '../config/passport_setup';

let router = express.Router();

// auth login
router.get('/login', (req,res) => {
  res.send('login');
});

// auth logout
router.get('/logout', (req,res) => {
  req.logout();
  res.redirect('/');
});

// auth with google
router.get('/google',passport.authenticate('google',{
  scope:['profile']
}));

// callback route for google to redirect to

router.get('/google/redirect',passport.authenticate('google'),(req,res) => {
  //res.redirect('localhost:3000/');
  res.redirect('/profile/');
  //res.send(req.user);
  //console.log(req);

});

export default router;
*/
