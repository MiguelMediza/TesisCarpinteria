import { Router } from "express";
const router = Router();
import { login, register, logout } from "../controllers/auth.js";

router.post('/login', login);

router.post('/register', register);

router.post('/logout', logout);

router.get("/test", (req, res)=>{
    res.send("its works");
})

export default router;