
import dotenv from "dotenv";
dotenv.config({
      path: "./.env"
});

import connectDB from "./db/index.js";
import { app } from "./app.js";




connectDB()
.then(()=>{
      app.listen(process.env.PORT || 8000,()=>{
            console.log(`Server is running on port ${process.env.PORT}`);
            app.on("err",(err)=>{
                  console.log("An error occured: ",err);
                  throw(err)
                  
            })
      })
})
.catch((err)=>{
      console.error("Error connecting to MongoDB",err);
})
























// import express from "express";
// const app = express();

// ( async()=>{
//       try{  
//             await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`);
//             app.on("error",(err)=>{
//                   console.log("Some Error Occured",err);
//             })

//             app.listen(process.env.PORT,() => {
//                   console.log(`Server is listening on port ${process.env.PORT}`);
//             })

//       }catch(err){
//             console.error("ERROR",err);
//             throw err;
//       }
      
// }) ()

