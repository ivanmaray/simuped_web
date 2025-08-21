import Navbar from "../components/Navbar.jsx"
export default function Perfil() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-indigo-600 mb-4">Mi Perfil</h1>
      <p className="text-gray-700 text-lg max-w-xl text-center mb-6">
        Aquí puedes actualizar tus datos personales, cambiar la contraseña y 
        gestionar tu cuenta de usuario.
      </p>
      <div className="bg-white shadow-md rounded-lg p-6 w-80">
        <form className="space-y-4">
          <input 
            type="text" 
            placeholder="Nombre completo" 
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input 
            type="password" 
            placeholder="Nueva contraseña" 
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button 
            type="submit" 
            className="w-full bg-indigo-500 text-white py-2 rounded hover:bg-indigo-600"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  );
}