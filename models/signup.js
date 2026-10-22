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
        minlength: 6,
        select: false
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
    },
    phone:{
        type: String,
        trim: true,
        default: '',
        maxlength: 20,
        match: [/^[0-9+()\s.-]{6,20}$/, 'Invalid phone number']
    },
    bio:{
        type: String,
        trim: true,
        default: '',
        maxlength: 300
    },
    isAdmin:{
        type: Boolean,
        default: false
    },
    suspended:{
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const user = mongoose.models.User || mongoose.model('User', Schema);

module.exports = user
