import { pool } from "../db.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
export const register = async (req, res) =>{
       try {
        const { username, email, password, tipo, name } = req.body;

        // Verificar si el usuario ya existe
        const [existingUsers] = await pool.query("SELECT * FROM usuarios WHERE username = ?", [username]);

        if (existingUsers.length > 0) {
            return res.status(409).json("Este username ya existe!");
        }

        // Hash de la contraseña
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        // Insertar nuevo usuario
        const insertQuery = "INSERT INTO usuarios (`username`, `email`, `password`, `tipo`, `name`) VALUES (?, ?, ?, ?, ?)";
        const [result] = await pool.query(insertQuery, [username, email, hashedPassword, tipo, name]);


        return res.status(200).json("Usuario creado exitosamente!");
    } catch (err) {
        console.error("Error en register:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }

}

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.query("SELECT * FROM usuarios WHERE username = ?", [username]);

        if (rows.length === 0) {
            return res.status(404).json("Usuario no encontrado!");
        }

        const user = rows[0];

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(400).json("Usuario o contraseña incorrectos!");
        }

        const token = jwt.sign({ id: user.id }, "secretkey");

        const { password: _, ...userWithoutPassword } = user;

        res.cookie("accesToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        }).status(200).json(userWithoutPassword);

    } catch (err) {
        console.error("❌ Error en login:", err);
        return res.status(500).json({ error: "Internal server error", details: err.message });
    }

};

export const logout = (req, res) => {
    try {
        res.clearCookie("accesToken", {
            secure: true,
            sameSite: "none",
        }).status(200).json("Cerraste sesión exitosamente!");
    } catch (err) {
        console.error("❌ Error en logout:", err);
        return res.status(500).json({ error: "Error al cerrar sesión", details: err.message });
    }
};