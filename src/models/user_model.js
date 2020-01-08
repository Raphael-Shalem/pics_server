import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName:String,
  userEmail:String,
  userPassword:String,
  avatar:String,
  followers:Array,
  following:Array
});

const User = mongoose.model('User', userSchema);

export default User;
