/*import express from 'express';

let router = express.Router();

const authCheck = (req,res,next) => {
  if(!req.user){
    res.redirect('../api/auth/login');
  } else {
    next();
  }
};

router.get('/', authCheck, (req,res) => {
  res.send('You are logged in '+req.user.userName);
  //res.render('profile');
});

export default router;


/*

browser:
  const id = "123";
  const response = yield call(axios.get,'/api/${id}');

server:
app.use(bodyParser)

  app.use('api',users.js);
  //users.js

  const router = express.router();
localhost:300/api/123

  router.get('/:poo',async(req, res) => {
    // query = {poo:123}

    const id = req.query.poo;
    const datafrom_database = await get data from database
  })

  router.post('/poo',async(req, res) => {
    const data = req.body
  })




*/
