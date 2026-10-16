const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    name: {
        type : String,
        required : true,
        trim: true
    },
    password:{
        type : String,
        required : true,
        minlength: 6
    },
    email:{
        type : String,
        required : true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    userType:{
        type: Number,
        required : true,
        enum: [1, 2]
    }
}, { timestamps: true });

const user = mongoose.models.User || mongoose.model('User', Schema);

module.exports = user
