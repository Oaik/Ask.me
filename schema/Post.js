const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    body: {
        type: String,
        required: true
    },
    userAsked: {
        type: String,
        required: true
    },
    allowName: {
        type: Boolean, 
        required: true
    },
    userAsking: {type: String},
    questionAnswered: {
        type: Boolean,
        default: false 
    },
    answer: {
        type: String
    }
})

const Post = mongoose.model('post', postSchema);
module.exports = Post;