import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
      {
            username: {
                  type: String,
                  required: true,
                  unique: true,
                  lowercase: true,
                  trim: true,
                  index: true
            },
            email: {
                  type: String,
                  required: true,
                  unique: true,
                  lowercase: true,
                  trim: true,
            },
            fullName: {
                  type: String,
                  required: true,
                  trim: true,
                  index: true
            },
            avatar: {
                  type: String, //cloudinary
                  required: true
            },
            coverimage: {
                  type: String
            },
            watchhistory: {
                  type: Schema.Types.ObjectId,
                  ref: "Video"
            },
            password: {
                  type: String,
                  required: [true, 'Password is required']
            },
            refreshtoken: {
                  type: String
            }
},

{
      timestamps: true
}
)

userSchema.pre(async function(next) {
      if(!this.isModified("password")) return next();

      this.password = bcrypt.hash(this.password,10)
      next()
})

userSchema.methods.isPasswordCorrect = async function(password){
      return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
      return jwt.sign(
            {
                  _id: this._id,
                  email: this.email,
                  username: this.username,
                  fullname: this.fullName
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                  expiresIn: process.env.ACCESS_TOKEN_EXPRIY
            }
      )
}

userSchema.methods.generateRefreshToken = function(){
      return jwt.sign(
            {
                  _id: this._id,
                  email: this.email,
                  username: this.username,
                  fullname: this.fullName
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                  expiresIn: process.env.REFRESH_TOKEN_EXPRIY
            }
      )
}

export const User  = mongoose.model("User", userSchema)