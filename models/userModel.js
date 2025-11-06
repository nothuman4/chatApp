const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'please enter your username'],
        unique: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'please enter your email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'please enter a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'enter your password or else get out '],
        minlength: 4,
        select: false 
    }
}, {
    timestamps: true 
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET || 'your_secret_key_from_env', {
        expiresIn: '30d'
    });
};

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword,d);
};

module.exports = mongoose.model('User', userSchema);