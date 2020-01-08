import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const imageSchema = new Schema({
  path:String,
  height:Number,
  width:Number,
  timestamp:String,
  creator:String,
  creatorName:String,
  avatar:String
});

const Image = mongoose.model('Image', imageSchema);

export default Image;

//create new schema for images
