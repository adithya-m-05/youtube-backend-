import { Router } from "express";
import { loginUser, logoutUSer, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middleware/multer.middleware.js"
import { resourceLimits } from "node:worker_threads";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route("/register").post(
      upload.fields([
            {
                  name: "avatar",
                  maxCount: 1
            },
            {
                  name: "coverImage",
                  maxCount: 1
            }
      ]),
      registerUser)

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT, logoutUSer)
router.route("/refresh-token").post(refreshAccessToken)

export default router