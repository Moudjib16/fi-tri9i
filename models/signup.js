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
    },
    // Existing accounts predate email verification and stay trusted.
    emailVerified:{
        type: Boolean,
        default: true
    },
    emailNotifications:{
        type: Boolean,
        default: true
    },
    emailVerificationTokenHash:{
        type: String,
        default: null,
        select: false
    },
    emailVerificationExpires:{
        type: Date,
        default: null,
        select: false
    },
    passwordResetTokenHash:{
        type: String,
        default: null,
        select: false
    },
    passwordResetExpires:{
        type: Date,
        default: null,
        select: false
    }
}, { timestamps: true });

Schema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
Schema.index({ passwordResetTokenHash: 1 }, { sparse: true });

const user = mongoose.models.User || mongoose.model('User', Schema);

module.exports = user
