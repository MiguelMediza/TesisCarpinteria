import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/authContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import tablasBackground from "../../assets/tablasBackground.jpg";
const Login = () => {
    const [inputs, setInputs] = useState({
      username: "",
      password: "",
    });
  
    const [err, setError] = useState(null);

    const navigate = useNavigate();
    const handleChange = (e) => {
      setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    try{
      await login(inputs);
      navigate("/");
    }catch (err) {
      setError(err.response.data);
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
          Imanod Control de Stock
        </Link>

        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-4">
          Login
        </h1>

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block mb-1 text-sm font-medium text-neutral-800"
            >
              Username
            </label>
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Username"
              value={inputs.username}
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
              Password
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

          {/* Mensaje de error */}
          {err && (
            <div>
              <span className="text-red-600 text-sm">{err}</span>
            </div>
          )}

          {/* Botón Login */}
          <button
            type="submit"
            className="w-full py-2.5 text-white bg-neutral-700 hover:bg-neutral-800 rounded transition"
          >
            Login
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-700 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
