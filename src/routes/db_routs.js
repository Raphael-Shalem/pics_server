import express from 'express';
import mongoose from 'mongoose';
import User from '../models/user_model';
import Image from '../models/pic_model';
import cors from 'cors';
import bcrypt from 'bcrypt';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import config from '../config';
import image_size from 'image-size';

const { ObjectId } = mongoose.Types;

let router = express.Router();

//const promise = (func, ...params) => new Promise((res, rej) => func(params, (err, result) => err ? rej(err) : res(result) ));



//make_new_user
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



router.post('/make_new_user', async(req,res) => {
  try{
     let user = await User.findOne({ userEmail:req.body.userEmail }).exec();
     let hash = await bcrypt.hash(req.body.userPassword, 10);

     if (user) {
       res.send({ user_already_exists:true });
     }

     if (!user) {

        let newUser = new User();

        newUser.userName = req.body.userName;
        newUser.userEmail = req.body.userEmail;
        newUser.userPassword = hash;
        newUser.avatar = '';
        newUser.followers = [];
        newUser.following = [];

        console.log(newUser);

        newUser.save((err,user) => {
           if(err){ res.send(err); }
           else {
              const token = jwt.sign({
               id: /*JSON.stringify(*/newUser._id/*, null, 2)*/,
               userName: newUser.userName
              }, config.jwtSecret);

              const token2 = jwt.sign({
                following: [],
                followers: [],
                feed: []
              }, config.jwtSecret);

              res.send({
                token: token,
                token2: token2,
                user_already_exists: false,
          //      user_id: JSON.stringify(newUser._id, null, 2),
                user_id: newUser._id,
                userName: newUser.userName
               });
            }
         });
     }
   }
   catch(err) {
      console.error("error occured in make_new_user route: ",err.message || err)
   }

});


//authenticate_user (login)
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/authenticate_user', async(req,res) => {
  try{
    const user = await User.findOne({ userEmail:req.body.userEmail }).exec();

    if (!user) { res.send({ successful_login:false }); return; }

    const paths = await Image.aggregate([
                          { $match: { creator: user._id.toString() } },
                          { $sort: { timestamp: -1 } },
                          { $project : { path: 1, height: 1, width: 1, _id:0 } }
                          ]).exec();


    let feed =  await Image.aggregate([
                          { $match: { creator: { $in: user.following } } },
                          { $sort: { timestamp: -1 } },
                          { $project : { path: 1, height: 1, width: 1, creator: 1, creatorName: 1, avatar: 1, _id:0 } }
                          ]).exec();



    await bcrypt.compare(req.body.userPassword, user.userPassword, (err, res_) => {
        if(err) { res.send(err) }
        if(res_) {

           const token = jwt.sign({
             id: user._id,
             userName: user.userName,
             paths: paths,
           }, config.jwtSecret);

           const token2 = jwt.sign({
             following: user.following,
             followers: user.followers,
             feed: feed || []
           }, config.jwtSecret);

           res.send({
              token: token,
              token2: token2,
              successful_login: true,
              user_id: user._id,
              userName:  user.userName,
              paths:  paths,
              following: user.following,
              followers: user.followers,
              feed: feed || []
            });
         }
        else { res.send({ successful_login:false }); }
    });
  }
  catch(err) {
     console.error("error occured in authenticate_user route: ",err.message || err)
  }
});


//upload_image
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -




router.post('/upload_pic', async (req, res) => {
  try {

    const storage = multer.diskStorage({
      destination: function(req, file, cb) {
        cb(null, 'src/images/')
      },
      filename: function(req, file, cb) {
        cb(null, new Date().toISOString());
      }
    });

    const file_filter = (req, file, cb) => {
      if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);

      } else {
        cb({ hey_stop_that:'hey stop that' });
      }
    };

    const upload = multer({
       storage: storage,
       fileFilter: file_filter,
       limits: { fileSize: 1024 * 1024 * 5 }
     }).single('pic');



     upload(req, res, (err) => {
       if(err){ res.send(err) }
       else {
         if(req.file === undefined) { res.send('req.file === undefined'); return; }

          //  let response = {};
            let newImage = new Image();

            var path = req.file.path.slice(10);
            var dimensions = image_size(req.file.path);

            console.log(req.body)

            newImage.path = path;
            newImage.height = dimensions.height;
            newImage.width = dimensions.width;
            newImage.timestamp = req.body.time;
            newImage.creator = req.body.user_id;
            newImage.creatorName = req.body.userName;
            newImage.avatar = req.body.avatar;

          //  console.log(newImage);

            newImage.save((err,user) => {
               if(err){ res.send(err); }
            //   else { response.successful_upload = true }
               else { res.send({ successful_upload:true }); }
             });


        }
     })
   }
   catch(err) {
      console.error("error occured in upload_pic route: ",err.message || err)
   }
});





//delete_image
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



router.post('/delete_image', async(req, res) => {
  try {
    const pic = req.body.source.length?1:0;
    const path = pic?req.body.source.slice(22):req.body.avatarName;
    const fs = require ('fs');

    if(!pic){
      await User.updateOne({ _id: req.body.user_id }, { $set: { avatar: '' }}).exec();
    }

    await Image.deleteOne({ path:path }).exec();

    fs.unlink('src/images'+path, (err) => {
      if (err) {throw err}
      else {  res.send({ successful_deletion:true });}
      console.log('file was deleted');
  });
  }
 catch(err) {
    console.error("error occured in delete_image route: ",err.message || err)
  }

});



// update_profile_page_path_list- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/update_profile_page_path_list', async(req,res) => {
 try {
         const paths = await Image.aggregate([
                        { $match: { creator: req.body.user_id.toString() } },
                        { $sort: { timestamp: -1 } },
                        { $project : { path: 1, height: 1, width: 1, _id: 0 } }
                        ]).exec();

         const token = jwt.sign({
           id: req.body.user_id,
           userName: req.body.userName,
           paths: paths,
         }, config.jwtSecret);

         res.send({
            token:token,
            successful_update:true,
            user_id:req.body.user_id,
            userName: req.body.userName,
            paths: paths || [],
          });
 }
 catch(err) {
    console.error("error occured in update_profile_page_path_list route: ",err.message || err)
 }
});




// get_paths_for_other_user- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/get_paths_for_other_user', async(req,res) => {
 try {
  const paths = await Image.aggregate([
                        { $match: { creator: req.body.user_id.toString() } },
                        { $sort: { timestamp: -1 } },
                        { $project : { path: 1, height: 1, width: 1, _id: 0 } }
                        ]).exec();

         res.send({
            successful_update:true,
            paths: paths || []
          });
 }
 catch(err) {
    console.error("error occured in get_paths_for_other_user route: ",err.message || err)
 }
});






// upload_avatar- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



router.post('/upload_avatar', async (req, res) => {
 try {

  //.......setup upload

  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'src/images/')
    },
    filename: function(req, file, cb) {
      cb(null, new Date().toISOString());
  //    cb(null, file.originalname);
    }
  });

  const file_filter = (req, file, cb) => {
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){
      cb(null, true);
    } else {
      cb({ hey_stop_that:'hey stop that' });
    }
  };

  // console.log('    -     -      -     -    -     -      -     -    -     -      -     -')
  // console.log(req.formData)
  // console.log('    -     -      -     -    -     -      -     -    -     -      -     -')
//  var path = req.file.path.slice(10);
/*
      User.updateOne(
        { _id: req.body.user_id },
        { $set: { avatar: path }}
      ).exec();


     Image.updateMany(
       { _id: req.body.user_id },
       { $set: { avatar: path }}
     ).exec();

*/
  const upload_avatar = multer({
     storage: storage,
     fileFilter: file_filter,
     limits: { fileSize: 1024 * 1024 * 5 }
   }).single('avatar');


   upload_avatar (req, res, (err) => {
     try{
     if(err){ res.send(err) }
     else {

       //....... delete old file


       const old_avatar = (req.body.avatarName.length);

       if(old_avatar){
             const path = req.body.avatarName;
             const fs = require ('fs');

             fs.unlink('src/images'+path, (err) => {
          //     if (err) {throw err}
               if (err) {console.log('Error deleting old avatar path  :  ',err)}
               else { console.log('file was deleted'); }

           });
        }

       if(req.file === undefined) { res.send('req.file === undefined'); return; }
       var path = req.file.path.slice(10);
        try {
           User.updateOne(
             { _id: req.body.user_id },
             { $set: { avatar: path }}
           ).exec();
         }
        catch (e) { console.log(e) }
        try {
          Image.updateMany(
            { creator: req.body.user_id },
            { $set: { avatar: path }}
          ).exec();
        }
        catch (e) { console.log(e) }

       res.send({ successful_upload:true });
      }
   }
   catch(err) {
        console.error("error occured in upload_avatar route: ",err.message || err)
     }
  })

 }
 catch(err) {
    console.error("error occured in upload_avatar route: ",err.message || err)
 }

});


// update_avatar_path- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



router.post('/update_avatar_path', async(req,res) => {
 try {

  console.log(mongoose.Types.ObjectId.isValid(req.body.user_id))
  const user = await User.findOne({ _id:req.body.user_id/*.toString()*/ }).exec();
  if(!user || !user.avatar){ res.send({ successful_update:false }) }
  else { res.send(
    {
       successful_update: true,
       avatar : user.avatar

      }
  ) }
 }
 catch(err) {
    console.error("error occured in update_avatar_path route: ",err.message || err)
 }
});


//follow_other_user- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/follow_other_user', async(req,res) => {
 try {

     const followers = req.body.followers;
     const new_following = req.body.following;
     const new_other_user_followers = req.body.other_user_followers;

     await User.updateOne({ _id: req.body.user_id }, { $set: { following: new_following }}).exec();
     await User.updateOne({ _id: req.body.other_user_id }, { $set: { followers: new_other_user_followers }}).exec();

     const feed =  await Image.aggregate([
                           { $match: { creator: { $in: new_following } } },
                           { $sort: { timestamp: -1 } },
                           { $project : { path: 1, height: 1, width: 1, creator: 1, creatorName: 1, avatar: 1, _id:0 } }
                           ]).exec();

     const token2 = jwt.sign({
       following: new_following,
       followers: followers,
       feed: feed || []
     }, config.jwtSecret);

     res.send({
        token2: token2,
        successful_update: true,
        following: new_following,
        new_other_user_followers: new_other_user_followers,
        feed: feed || []
      });

     if(!req.body.following || !req.body.other_user_followers) { res.send({ successful_update: false }) }


   }
   catch(err) {
      console.error("error occured in follow_other_user route: ",err.message || err)
   }
});



//suggest_users- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/suggest_users', async(req,res) => {
 try {

   const users = await User.aggregate([
                         { $match: { userEmail: { $in: [  'a@a.a', 'b@b.b', 'c@c.c' ] } } },
                         { $project : { _id: 1, avatar: 1, userName: 1, followers: 1, following: 1 } }
                         ]).exec();
                         
   res.send({ users: users, successful_res: true });
 }
 catch(err) {
    console.error("error occured in suggest_users route: ",err.message || err)
 }
});



//search_for_user- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


router.post('/search_for_user', async(req,res) => {
 try {

   const user_input = req.body.user_input;

   if (typeof user_input === 'string') {
      const users = await User.aggregate([
                           { $match: { userName: user_input } },
                           { $limit : 3 },
                           { $project : { _id: 1, avatar: 1, userName: 1, followers: 1, following: 1 } }
                           ]).exec();

      res.send({ users: users, successful_res: true });
   }

   else if (Array.isArray(user_input)) {

      let users = [];
      for (let i = 0; i < user_input.length; i++) {
        const user = await User.findOne(
          { _id: user_input[i] },
          { _id: 1, userName: 1, followers: 1, following: 1, avatar: 1 }
        ).exec();
        users.push(user);
      }


      res.send({ users: users, successful_res: true });
   }
   else {
     res.status(503).send({ error: `Expect 'user_input' to be a string or an array. got '${typeof user_input}'`})
   }
 }
 catch(err) {
    console.error("error occured in search_for_user route: ",err.message || err)
 }
});

// delete user- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


//1 delete avatar
//2 delete all images
//3 delete user


router.post('/delete_user', async(req, res) => {

  try {
    const { avatar, user_id, following, followers } = req.body;
    const fs = require ('fs');

//1 delete avatar

    if(avatar.length) {

      await Image.deleteOne({ path:avatar }).exec();

      await fs.unlink('src/images'+avatar, (err) => {
            if (err) {throw err}
            else {  console.log('avatar was deleted'); }
      });
    }

//2 delete all images


    const paths = await Image.aggregate([
                      { $match: { creator: user_id.toString() } },
                      { $project : { path: 1, _id:0 } }
                      ]).exec();

    const arr = Object.values(paths);

    if(arr.length){

      function promise (myFunction, ...params) {
        return new Promise(function(resolve, reject) {
          return myFunction(...params, function(error, result) {
            return error ? reject(error) : resolve(result);
          });
        })
      }

     async function delete_files(arr) {

        for (let i = 0; i < arr.length; i++) {
          await promise(fs.unlink, 'src/images'+arr[i].path);
          console.log(`file ${i} deleted`);
        }
        console.log('all images deleted')
      }

     delete_files(arr)

     await Image.deleteMany({ creator: user_id.toString() }).exec();

   }

//3 delete id from all following lists

    // let feed =  await Image.aggregate([
    //                       { $match: { creator: { $in: user.following } } },
    //                       { $sort: { timestamp: -1 } },
    //                       { $project : { path: 1, height: 1, width: 1, creator: 1, creatorName: 1, avatar: 1, _id:0 } }
    //                       ]).exec();

//2 delete user

   await User.deleteOne({ _id:user_id/*.toString()*/ }).exec();

   res.send({ successful_deletion: true });
  }
 catch(err) {
    console.error("error occured in delete_user route: ",err.message || err);
    res.send({ successful_deletion: false });
  }

});



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


export default router;















/*
router.post('/suggest_users', async(req,res) => {
 try {

  //let counter = 0;
   const user_id = req.body.user_id;
   let suggestions = [];
   let cursor = await User.find().cursor();

   cursor.on('data', function(doc) {

      if(suggestions.length < 3){
        if(JSON.stringify(doc._id) !== JSON.stringify(user_id)) {
            suggestions.push({ id: doc._id, userName: doc.userName,  avatar: doc.avatar });
            console.log('suggestions1  :  ',suggestions);
        }
      }
    });
   cursor.on('close', function() { console.log('the end'); });

   console.log('suggestions2  :  ',suggestions);

   res.send({ suggestions: suggestions, successful_res: true });
 }
 catch(err) {
    console.error("error occured in suggest_users route: ",err.message || err)
 }
});

*/
















/*

router.get('/cookie_test', async(req,res) => {
  try{
       var a ='aaa';
       res.cookie('cookieName',a, { maxAge: 900000, httpOnly: true });
       console.log('cookie created successfully');
    //   res.send({ 'ok':true });
     }

   catch(err) {
      console.error("error occured in cookie_test route: ",err.message || err)
   }

});

















     console.log(test)
  //  let avatars = [];

    // for (let i = 0; i < user.following.length; i++) {
    //    const avatar = await User.find(
    //     { _id: { $in: user.following } },
    // //    { _id: user.following },
    //     { avatar: 1 }
    //   ).exec();
    //   avatars.push(avatar)
    // }

  //  console.log(avatar)

    // const hash = (array, field = 'creator') => array.reduce(
    //   (a, c) => Object.assign(a, { [c[field]]: c })
    // ,{});
    //
    // console.log("feed: ",feed);
    // console.log("avatar ",avatar);
  //  console.log(">>>>>> hash(feed): ",hash(feed));

  // console.log('^^^^^^^^feed^^^^^^^^^^^^');
   //console.log(feed);
  //   console.log('^^^^^^^^^FEED^^^^^^^^^^^^');
  //   console.log(feed);
     console.log('^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^');
*/
