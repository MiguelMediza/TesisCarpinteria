import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api"; 
import tablasBackground from "../../assets/tablasBackground.jpg";
const Register = () => {
  const navigate = useNavigate();

  const [inputs, setInputs] = useState({
    username: "",
    email: "",
    password: "",
    tipo: "",
    name: ""
  });

  const [err, setError] = useState(false);
  const [messageType, setMessageType] = useState("");
  const validateInputs = () => {
    if (!inputs.username) return "Es requerido el username.";
    if (!inputs.email) return "Es requerido un email.";
    if (!inputs.password) return "Es necesario una contraseña.";
    if (!inputs.name) return "Es necesario un nombre.";
    if (!inputs.tipo) return "Es requerido el tipo de usuario.";
    return null;
  };

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const handleClick = async (e) => {
    e.preventDefault();
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      setMessageType("error");
    return;
    }
    try {
      await api.post("/usuarios/register", inputs);
      setError("Registrado exitosamente, ahora puedes iniciar sesión.");
      setMessageType("success");
      setInputs({ username: "", email: "", password: "", tipo: "", name: "" });
      setTimeout(() => navigate("/login"), 3000); 
  }catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data || "Error al registrarse.";
    setError(msg);
    setMessageType("error");
    console.log(err);
  }
};
  
  return (
<section className="relative flex items-center justify-center min-h-screen bg-neutral-50">
      {/* Fondo de madera difuminado */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur opacity-90"
        style={{ backgroundImage: `url(${tablasBackground})` }}
      />

      <div className="relative z-10 w-full sm:max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-md">
        <Link
          to="/"
          className="block mb-6 text-2xl font-semibold text-neutral-800 text-center"
        >
          Imanod control de stock.
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          Register
        </h1>

        <form
          className="space-y-4 md:space-y-6"
          onSubmit={handleClick}
        >
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Usuario
            </label>
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Usuario"
              value={inputs.username}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="name@company.com"
              value={inputs.email}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              value={inputs.password}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Nombre
            </label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Nombre"
              value={inputs.name}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {/* Tipo de usuario */}
          <div>
            <label
              htmlFor="tipo"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Tipo de usuario
            </label>
            <select
              name="tipo"
              id="tipo"
              value={inputs.tipo}
              onChange={handleChange}
              className="w-full p-2 rounded border border-neutral-300 bg-neutral-100 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="" disabled>
                Selecciona un tipo
              </option>
              <option value="encargado">Encargado</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          
            {err && (
              <span
                className={
                messageType === "error"
                  ? "text-red-500"
                  : "text-green-500"
                }
                >
                {err}
              </span>
            )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            Registrarse
          </button>

          <p className="mt-4 text-sm text-neutral-700 text-center">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium underline">
              Inicia sesión aquí
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
};

export default Register;
