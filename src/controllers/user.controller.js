import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { cloudinaryUpload } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
     try {
          const user = await User.findById(userId)
          if (!user) {
               throw new ApiError(404, "User does not exist")
          }

          const accessToken = user.generateAccessToken()
          const refreshToken = user.generateRefreshToken()

          user.refreshToken = refreshToken
          await user.save({ validateBeforeSave: false })

          return { accessToken, refreshToken }
     } catch (error) {
          throw new ApiError(500, "Error while generating access and refresh tokens")
     }
}

const registerUser = asyncHandler(async (req, res) => {
     //get user details
     //validate details
     //check if user already exists: username, email
     //check for images, avatar
     //upload to cloudinary, avatar
     //create user object, create db
     //remove password and referesh token from response
     //check for creation
     //return response

     const { fullName, email, username, password } = req.body
     console.log("email: ", email);

     if (
          [fullName, email, username, password].some((field) => field?.trim() === "")
     ) {
          throw new ApiError(400, "All fields are required")
     }

     const existedUser = await User.findOne({
          $or: [{ username }, { email }]
     })

     if (existedUser) {
          throw new ApiError(409, "User with same email or username already exists")
     }

     console.log("FILES RECEIVED:", req.files);

     const avatarLocalPath = req.files?.avatar?.[0]?.path;
     const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

     console.log("AVATAR PATH:", avatarLocalPath);
     console.log("COVER IMAGE PATH:", coverImageLocalPath);

     if (!avatarLocalPath) {
          throw new ApiError(400, "Avatar file is required")
     }

     const avatar = await cloudinaryUpload(avatarLocalPath)
     const coverImage = await cloudinaryUpload(coverImageLocalPath)

     if (!avatar) {
          throw new ApiError(400, "Error while uploading avatar to cloudinary")
     }

     const user = await User.create({
          fullName,
          avatar: avatar.url,
          coverImage: coverImage?.url || "",
          email,
          password,
          username: username.toLowerCase()
     })

     const createdUser = await User.findById(user._id).select(
          "-password -refreshToken"
     )

     if (!createdUser) {
          throw new ApiError(500, "Something went wrong while creating user")
     }

     return res.status(201).json(
          new ApiResponse(200, createdUser, "User registered Succesfully")
     )
})

const loginUser = asyncHandler(async (req, res) => {
     //req body -> data
     //validate username or email
     //find the user
     //password check
     //access and refresh token
     //send cookie

     const { email, username, password } = req.body

     if (!username && !email) {
          throw new ApiError(400, "Username or email required")
     }

     const user = await User.findOne({
          $or: [{ username }, { email }]
     })

     if (!user) {
          throw new ApiError(404, "User does not exist")
     }

     const isPasswordValid = await user.isPasswordCorrect(password)

     if (!isPasswordValid) {
          throw new ApiError(401, "Password is incorrect")
     }

     const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

     const loggenInUser = await User.findById(user._id).select("-password -refreshToken")

     const options = {
          httpOnly: true,
          secure: true
     }

     return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", refreshToken, options)
          .json(
               new ApiResponse(200, {
                    user: loggenInUser, accessToken, refreshToken
               },
                    "User loggen in succesfuly"
               )
          )
})

const logoutUSer = asyncHandler(async (req, res) => {
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $set: {
                    refreshToken: undefined
               }
          },
          {
               new: true
          }
     )

     const options = {
          httpOnly: true,
          secure: true
     }

     return res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken){
          throw new ApiError(401, "Unauthorized request")
     }

     try {
          const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     
          const user = await User.findById(decodedToken?._id)
     
          if(!user){
               throw new ApiError(401, "invalid refresh token")
          }
     
          if(incomingRefreshToken!== user?.refreshToken){
               throw new ApiError(401,"Refresh Token is expired or used")
          }
     
          const options = {
               httpOnly: true,
               secure: true
          }
     
          const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
     
          return res
          .status(200)
          .cookie("accessToken",accessToken,options)
          .cookie("refreshToken",newRefreshToken,options)
          .json(
               new ApiResponse(
                    200,
                    {accessToken,refreshToken: newRefreshToken},
                    "Access token refreshed"
               )
          )
     } catch (error) {
          throw new ApiError(401,error?.message || "Invalid refresh token")
     }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
     const {oldPassword,newPassword} = req.body

     const user = await User.findById(req.user?._id)
     const isPasswordCorrect = await isPasswordCorrect(oldPassword)

     if(!isPasswordCorrect){
          throw new ApiError(400,"invalid old Password")
     }

     user.password = newPassword
     await user.save({validateBeforeSave: false})

     return res
     .status(200)
     .json(new ApiResponse(200,{},"Password is changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{

     return res
     .status(200)
     .json(new ApiResponse(200,req.user,"Current User fetched"))

})

const updateAccountDetails = asyncHandler(async(req,res)=>{
     const {fullName, email} = req.body

     if(!fullName || !email){
          throw new ApiError(400,"All fields are required")
     }

     const user = await User.findById(
          req.user?._id,
          {
               $set: {
                    fullName,
                    email: email
               }
          },
          {new: true}     
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateAvatar = asyncHandler(async(req,res)=>{
     const avatarLocalPath = req.file?.path

     if(!avatarLocalPath){
          throw new ApiError(400, "Avatar file is missing")
     }

     const avatar = await changeCurrentPassword(avatarLocalPath)

     if(!avatar.url){
          throw new ApiError(400, "Error while uploading Avatar")
     }

     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    avatar: avatar.url
               }
          },
          {new: true}
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async(req,res)=>{
     const avatarLocalPath = req.file?.path

     if(!coverImageLocalPath){
          throw new ApiError(400, "Cover Image file is missing")
     }

     const coverImage = await changeCurrentPassword(coverImageLocalPath)

     if(!coverImage.url){
          throw new ApiError(400, "Error while uploading Cover Image")
     }

     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    coverImage: coverImage.url
               }
          },
          {new: true}
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200,user,"Cover Image updated successfully"))
})

export {
     registerUser,
     loginUser,
     logoutUSer,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateAvatar,
     updateCoverImage
}
