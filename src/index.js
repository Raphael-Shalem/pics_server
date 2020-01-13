import express from 'express';
//import passport from 'passport';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import auth_routs from './routes/auth_routs';
import db_routs from './routes/db_routs';
//import images from './images';
import profile_routs from './routes/profile_routs';
import keys from './config/keys';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 80;

const cors_options = {
  origin: 'https://raphael-pics.herokuapp.com',
  optionsSuccessStatus: 200
}
app.use(cors(cors_options));
app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

mongoose.connect(keys.mongodb.dbURI, { useNewUrlParser: true }, () => {
  console.log("connected to mongodb");
});

var imageDir = require('path').join(__dirname,'/images');
console.log(imageDir);
app.use(bodyParser.json());
//app.use('/api/auth', auth_routs);
app.use('/api/db', db_routs);
app.use(express.static(imageDir));

//app.use('/profile', profile_routs);

app.listen(port, () => console.log(`listening on port ${port}`));

/*

app.use(cookieSession({
  maxAge: 24*60*60*1000,
  keys: [keys.session.cookieKey]
}));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());
*/
