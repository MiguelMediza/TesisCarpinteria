import { Router } from "express";
const router = Router();
import { login, register, logout } from "../controllers/auth.js";
import { getUser } from "../controllers/user.js";

router.post('/login', login);

router.post('/register', register);

router.post('/logout', logout);

router.get("/find/:userId", getUser)

router.get("/test", (req, res)=>{
    res.send("its works");
})

export default router;