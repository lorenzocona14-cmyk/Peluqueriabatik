import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inicio');

  // Estados reales para Firebase
  const [servicios, setServicios] = useState([]);
  const [nuevoServicio, setNuevoServicio] = useState({ name: '', price: '' });
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Datos de prueba temporales solo para las otras pestañas
  const [clientes, setClientes] = useState([
    { id: 1, nombre: 'Juan Pérez', telefono: '2615551234', servicio: 'Corte Premium', peluquero: 'Eze', origen: 'Web', fecha: '2026-06-15' }
  ]);

  // --- LÓGICA DE SERVICIOS (FIREBASE) ---
  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      const querySnapshot = await getDocs(collection(db, "servicios"));
      const servs = [];
      querySnapshot.forEach((doc) => {
        servs.push({ id: doc.id, ...doc.data() });
      });
      setServicios(servs);
    } catch (error) {
      console.error("Error al cargar servicios:", error);
    }
    setLoadingServicios(false);
  };

  // Cargar servicios cuando el usuario entra a la pestaña de servicios
  useEffect(() => {
    if (activeTab === 'servicios') {
      fetchServicios();
    }
  }, [activeTab]);

  const handleAddServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.name || !nuevoServicio.price) return;
    
    try {
      await addDoc(collection(db, "servicios"), {
        name: nuevoServicio.name,
        price: Number(nuevoServicio.price)
      });
      setNuevoServicio({ name: '', price: '' });
      fetchServicios(); // Recargar la lista
    } catch (error) {
      console.error("Error al agregar:", error);
      alert("Hubo un error al guardar el servicio.");
    }
  };

  const handleDeleteServicio = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar este servicio?")) {
      try {
        await deleteDoc(doc(db, "servicios", id));
        fetchServicios(); // Recargar la lista
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Resumen del Mes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Clientes Totales (Junio)</p>
                <p className="text-4xl font-bold text-white mt-2">142</p>
                <p className="text-sm text-green-500 mt-2">↑ 12% vs mes anterior</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Turnos vía Web</p>
                <p className="text-4xl font-bold text-white mt-2">89</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Ingresos Estimados</p>
                <p className="text-4xl font-bold text-white mt-2">$2.1M</p>
              </div>
            </div>
          </div>
        );

      case 'clientes':
        return (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-100">Gestión de Clientes</h2>
              <button className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-lg font-bold hover:bg-white transition">
                + Agregar Cliente Manual
              </button>
            </div>
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-300">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Teléfono</th>
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Peluquero</th>
                    <th className="p-4">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition">
                      <td className="p-4 font-medium text-neutral-200">{c.nombre}</td>
                      <td className="p-4">{c.telefono}</td>
                      <td className="p-4">{c.servicio}</td>
                      <td className="p-4">{c.peluquero}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${c.origen === 'Web' ? 'bg-blue-500/10 text-blue-400' : 'bg-neutral-700 text-neutral-300'}`}>
                          {c.origen}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'fechas':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Bloqueo de Fechas</h2>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 max-w-md">
              <label className="block text-sm font-medium text-neutral-400 mb-2">Fecha a bloquear:</label>
              <input type="date" className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 mb-4" />
              <label className="block text-sm font-medium text-neutral-400 mb-2">Peluquero (Opcional):</label>
              <select className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 mb-6">
                <option value="Todos">Todos (Cerrar local)</option>
                <option value="Eze">Solo Eze</option>
                <option value="Nico">Solo Nico</option>
              </select>
              <button className="w-full bg-red-500/10 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold hover:bg-red-500 hover:text-white transition">
                Bloquear Fecha en la Web
              </button>
            </div>
          </div>
        );

      case 'horarios':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Configuración de Horarios</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-bold mb-4 text-neutral-200">Horarios Activos</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-neutral-800 border border-neutral-700 px-3 py-1 rounded text-sm text-neutral-300 flex items-center gap-2">
                    10:00 <button className="text-red-400 hover:text-red-300">×</button>
                  </span>
                </div>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-bold mb-4 text-neutral-200">Agregar Horario / Hora Extra</h3>
                <div className="flex gap-4">
                  <input type="time" className="flex-1 p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100" />
                  <button className="bg-neutral-100 text-neutral-900 px-6 py-2 rounded-lg font-bold hover:bg-white transition">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'servicios':
        return (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-100">Servicios y Precios</h2>
            </div>

            {/* Formulario para agregar un servicio nuevo */}
            <form onSubmit={handleAddServicio} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-400 mb-2">Nombre del Servicio</label>
                <input 
                  type="text" 
                  placeholder="Ej: Corte Clásico"
                  value={nuevoServicio.name}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, name: e.target.value})}
                  className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-400 mb-2">Precio ($)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 15000"
                  value={nuevoServicio.price}
                  onChange={(e) => setNuevoServicio({...nuevoServicio, price: e.target.value})}
                  className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500"
                  required
                />
              </div>
              <button type="submit" className="bg-neutral-100 text-neutral-900 px-6 py-3 rounded-lg font-bold hover:bg-white transition w-full md:w-auto">
                + Agregar Servicio
              </button>
            </form>

            {/* Lista de servicios desde Firebase */}
            <div className="grid gap-4">
              {loadingServicios ? (
                <p className="text-neutral-500 text-center py-4">Cargando servicios...</p>
              ) : servicios.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">No hay servicios cargados. Agregá uno arriba.</p>
              ) : (
                servicios.map(svc => (
                  <div key={svc.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-neutral-200">{svc.name}</h3>
                      <p className="text-neutral-400">${svc.price.toLocaleString('es-AR')}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteServicio(svc.id)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 border border-red-500/20 rounded bg-red-500/10 hover:bg-red-500/20 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex text-neutral-50 font-sans selection:bg-neutral-700">
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-2xl font-black tracking-widest text-neutral-100">BATIK</h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Panel de Control</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'inicio', label: '📊 Inicio' },
            { id: 'clientes', label: '👥 Clientes y Turnos' },
            { id: 'fechas', label: '📅 Bloquear Fechas' },
            { id: 'horarios', label: '⏰ Horarios' },
            { id: 'servicios', label: '✂️ Servicios y Precios' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                activeTab === item.id 
                  ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm' 
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <a href="/" target="_blank" className="block w-full text-center py-2 text-sm text-neutral-400 hover:text-white border border-neutral-800 rounded hover:bg-neutral-800 transition">
            Ver página web ↗
          </a>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
