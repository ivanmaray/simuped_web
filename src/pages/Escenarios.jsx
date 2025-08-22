import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Escenarios() {
  const navigate = useNavigate();
  const [escenarios, setEscenarios] = useState([]);

  useEffect(() => {
    async function fetchEscenarios() {
      const { data, error } = await supabase
        .from("scenarios")
        .select("id, title, summary, status");
      if (error) {
        console.error("Error fetching escenarios:", error);
      } else {
        setEscenarios(data);
      }
    }
    fetchEscenarios();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-8 text-center">Escenarios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {escenarios.map(({ id, title, summary }) => {
          return (
            <div
              key={id}
              className="border rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
              tabIndex={0}
              role="button"
              onClick={() => navigate(`/simulacion/${id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/simulacion/${id}`); }}
            >
              <div>
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-gray-700 mb-4">{summary || "Sin resumen."}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}