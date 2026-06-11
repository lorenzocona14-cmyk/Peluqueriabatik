import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inicio');

  // Estados Globales
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de Formularios
  const [nuevoServicio, setNuevoServicio] = useState({ name: '', price: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', servicio: '', peluquero: 'Eze' });
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState({ date: '', stylist: 'Todos' });

  // --- CARGA DE DATOS DESDE FIREBASE ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar Servicios
      const servSnap = await getDocs(collection(db, "servicios"));
      setServicios(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Cargar Turnos y Clientes (Ordenados por fecha de creación)
      const turnosSnap = await getDocs(query(collection(db, "turnos"), orderBy("createdAt", "desc")));
      setTurnos(turnosSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Cargar Horarios
      const horSnap = await getDocs(collection(db, "horarios"));
      const horData = horSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      horData.sort((a, b) => a.time.localeCompare(b.time)); // Ordenar por hora
      setHorarios(horData);

      // Cargar Fechas Bloqueadas
      const fechSnap = await getDocs(collection(db, "fechas_bloqueadas"));
      setFechasBloqueadas(fechSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error("Error cargando datos:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // --- LÓGICA DE TURNOS ---
  const handleCancelarTurno = async (turno) => {
    if (window.confirm(`¿Querés cancelar el turno de ${turno.nombre} y avisarle por WhatsApp?`)) {
      try {
        await deleteDoc(doc(db, "turnos", turno.id));
        fetchData();
        
        // Redirigir a WhatsApp
        const telefonoLimpio = turno.telefono.replace(/\D/g, ''); // Limpiar símbolos
        const mensaje = `Hola ${turno.nombre}, te escribimos de la peluquería Batik. Lamentablemente tuvimos un inconveniente y necesitamos reprogramar o cancelar tu turno del día ${turno.date} a las ${turno.time} con ${turno.stylist}. Avisanos cómo querés seguir. ¡Disculpas!`;
        window.open(`https://wa.me/549${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
      } catch (error) {
        console.error("Error al cancelar:", error);
      }
    }
  };

  // --- LÓGICA DE CLIENTES MANUALES ---
  const handleAgregarClienteManual = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.servicio) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, "turnos"), {
        nombre: nuevoCliente.nombre,
        telefono: nuevoCliente.telefono || 'Sin especificar',
        service: nuevoCliente.servicio,
        stylist: nuevoCliente.peluquero,
        date: today,
        time: 'Atención Local',
        origen: 'Local',
        createdAt: new Date()
      });
      setNuevoCliente({ nombre: '', telefono: '', servicio: '', peluquero: 'Eze' });
      fetchData();
      alert("Cliente local registrado con éxito.");
    } catch (error) {
      console.error("Error registrando cliente:", error);
    }
  };

  // --- LÓGICA DE HORARIOS ---
  const handleAgregarHorario = async (e) => {
    e.preventDefault();
    if (!nuevoHorario) return;
    try {
      await addDoc(collection(db, "horarios"), { time: nuevoHorario });
      setNuevoHorario('');
      fetchData();
    } catch (error) {
      console.error("Error agregando horario:", error);
    }
  };

  const handleEliminarHorario = async (id) => {
    try {
      await deleteDoc(doc(db, "horarios", id));
      fetchData();
    } catch (error) {
      console.error("Error eliminando horario:", error);
    }
  };

  // --- LÓGICA DE FECHAS BLOQUEADAS ---
  const handleBloquearFecha = async (e) => {
    e.preventDefault();
    if (!nuevaFecha.date) return;
    try {
      await addDoc(collection(db, "fechas_bloqueadas"), {
        date: nuevaFecha.date,
        stylist: nuevaFecha.stylist
      });
      setNuevaFecha({ date: '', stylist: 'Todos' });
      fetchData();
    } catch (error) {
      console.error("Error bloqueando fecha:", error);
    }
  };

  const handleEliminarFecha = async (id) => {
    try {
      await deleteDoc(doc(db, "fechas_bloqueadas", id));
      fetchData();
    } catch (error) {
      console.error("Error eliminando fecha:", error);
    }
  };

  // --- LÓGICA DE SERVICIOS (IMGBB) ---
  const handleAddServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.name || !nuevoServicio.price) return;
    setIsUploading(true);
    let imageUrl = ''; 
    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const apiKey = 'TU_API_KEY_DE_IMGBB_ACA'; 
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const imgbbData = await imgbbRes.json();
        if (imgbbData.success) imageUrl = imgbbData.data.url;
      }
      await addDoc(collection(db, "servicios"), {
        name: nuevoServicio.name,
        price: Number(nuevoServicio.price),
        description: nuevoServicio.description,
        image: imageUrl
      });
      setNuevoServicio({ name: '', price: '', description: '' });
      setImageFile(null);
      document.getElementById('imageInput').value = ''; 
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
    setIsUploading(false);
  };

  const handleDeleteServicio = async (id) => {
    if (window.confirm("¿Eliminar este servicio?")) {
      await deleteDoc(doc(db, "servicios", id));
      fetchData();
    }
  };

  const renderContent = () => {
    if (loading && activeTab !== 'servicios') return <div className="text-neutral-500 py-10">Cargando datos...</div>;

    switch (activeTab) {
      case 'inicio':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Resumen del Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Turnos Web Registrados</p>
                <p className="text-4xl font-bold text-white mt-2">{turnos.filter(t => t.origen === 'Web').length}</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Clientes Locales (Manuales)</p>
                <p className="text-4xl font-bold text-white mt-2">{turnos.filter(t => t.origen === 'Local').length}</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Servicios Activos</p>
                <p className="text-4xl font-bold text-white mt-2">{servicios.length}</p>
              </div>
            </div>
          </div>
        );

      case 'turnos':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Turnos Solicitados</h2>
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-300">
                  <tr>
                    <th className="p-4">Fecha y Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Peluquero</th>
                    <th className="p-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.filter(t => t.origen === 'Web').map(t => (
                    <tr key={t.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                      <td className="p-4 font-bold text-white">{t.date.split('-').reverse().join('/')} | {t.time}</td>
                      <td className="p-4">
                        <p className="text-neutral-200 font-medium">{t.nombre}</p>
                        <p className="text-xs">{t.telefono}</p>
                      </td>
                      <td className="p-4">{t.service}</td>
                      <td className="p-4">{t.stylist}</td>
                      <td className="p-4">
                        <button onClick={() => handleCancelarTurno(t)} className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition font-bold text-xs">
                          Cancelar y Avisar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {turnos.filter(t => t.origen === 'Web').length === 0 && (
                    <tr><td colSpan="5" className="p-4 text-center">No hay turnos web registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'clientes':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Historial y Clientes Manuales</h2>
            
            {/* Formulario Cliente Manual */}
            <form onSubmit={handleAgregarClienteManual} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">Agregar corte sin turno (Local)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Nombre *" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} className="p-3 bg-neutral-950 border border-neutral-700 rounded text-white" required />
                <input type="text" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} className="p-3 bg-neutral-950 border border-neutral-700 rounded text-white" />
                <select value={nuevoCliente.servicio} onChange={e => setNuevoCliente({...nuevoCliente, servicio: e.target.value})} className="p-3 bg-neutral-950 border border-neutral-700 rounded text-white" required>
                  <option value="">Servicio *</option>
                  {servicios.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <select value={nuevoCliente.peluquero} onChange={e => setNuevoCliente({...nuevoCliente, peluquero: e.target.value})} className="p-3 bg-neutral-950 border border-neutral-700 rounded text-white">
                  <option value="Eze">Eze</option>
                  <option value="Nico">Nico</option>
                </select>
              </div>
              <button type="submit" className="bg-neutral-100 text-neutral-900 px-6 py-2 rounded font-bold hover:bg-white transition">Guardar Cliente</button>
            </form>

            {/* Tabla Historial Completo */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
              <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-300">
                  <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Último Servicio</th>
                    <th className="p-4">Peluquero</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map(t => (
                    <tr key={t.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                      <td className="p-4 font-medium text-neutral-200">{t.nombre} <br/><span className="text-xs text-neutral-500">{t.telefono}</span></td>
                      <td className="p-4">{t.service}</td>
                      <td className="p-4">{t.stylist}</td>
                      <td className="p-4">{t.date.split('-').reverse().join('/')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.origen === 'Web' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                          {t.origen}
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
            <h2 className="text-2xl font-bold text-neutral-100">Bloquear Fechas (Feriados / Ausencias)</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <form onSubmit={handleBloquearFecha} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
                <label className="block text-sm font-medium text-neutral-400">Fecha a bloquear:</label>
                <input type="date" value={nuevaFecha.date} onChange={e => setNuevaFecha({...nuevaFecha, date: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100" required />
                <label className="block text-sm font-medium text-neutral-400">¿Quién no atiende?</label>
                <select value={nuevaFecha.stylist} onChange={e => setNuevaFecha({...nuevaFecha, stylist: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100">
                  <option value="Todos">Local Cerrado (Ambos)</option>
                  <option value="Eze">Solo Eze</option>
                  <option value="Nico">Solo Nico</option>
                </select>
                <button type="submit" className="w-full bg-red-500/10 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold hover:bg-red-500 hover:text-white transition">Bloquear en la Web</button>
              </form>

              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-bold text-white mb-4">Fechas Bloqueadas Actuales</h3>
                <div className="space-y-2">
                  {fechasBloqueadas.length === 0 ? <p className="text-neutral-500">No hay bloqueos activos.</p> : null}
                  {fechasBloqueadas.map(f => (
                    <div key={f.id} className="flex justify-between items-center bg-neutral-950 p-3 rounded border border-neutral-800">
                      <span className="text-neutral-200">{f.date.split('-').reverse().join('/')} <span className="text-neutral-500 text-xs ml-2">({f.stylist})</span></span>
                      <button onClick={() => handleEliminarFecha(f.id)} className="text-red-400 hover:text-red-300 font-bold">X</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'horarios':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Configurar Horarios Disponibles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <form onSubmit={handleAgregarHorario} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
                <h3 className="text-lg font-bold text-white">Agregar Franja Horaria</h3>
                <input type="time" value={nuevoHorario} onChange={e => setNuevoHorario(e.target.value)} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100" required />
                <button type="submit" className="w-full bg-neutral-100 text-neutral-900 py-3 rounded-lg font-bold hover:bg-white transition">Añadir a la grilla</button>
              </form>

              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-bold text-white mb-4">Grilla de Horarios Activa</h3>
                <div className="flex flex-wrap gap-2">
                  {horarios.length === 0 ? <p className="text-neutral-500">Añadí horarios para que los clientes puedan reservar.</p> : null}
                  {horarios.map(h => (
                    <span key={h.id} className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded text-sm text-neutral-200 flex items-center gap-3">
                      {h.time} 
                      <button onClick={() => handleEliminarHorario(h.id)} className="text-red-400 hover:text-red-300 text-lg leading-none">&times;</button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-4">Si borrás "13:30" y agregás "13:45", el cambio es instantáneo en la web.</p>
              </div>
            </div>
          </div>
        );

      case 'servicios':
        return (
          // (Se mantiene tu código exacto de la pestaña servicios con ImgBB)
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Servicios y Precios</h2>
            <form onSubmit={handleAddServicio} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nombre del Servicio *" value={nuevoServicio.name} onChange={(e) => setNuevoServicio({...nuevoServicio, name: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500" required />
                <input type="number" placeholder="Precio ($) *" value={nuevoServicio.price} onChange={(e) => setNuevoServicio({...nuevoServicio, price: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500" required />
              </div>
              <input id="imageInput" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 cursor-pointer" />
              <textarea placeholder="Descripción del servicio..." value={nuevoServicio.description} onChange={(e) => setNuevoServicio({...nuevoServicio, description: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 min-h-[80px]" />
              <button type="submit" disabled={isUploading} className={`w-full py-3 rounded-lg font-bold transition ${isUploading ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-neutral-100 text-neutral-900 hover:bg-white'}`}>
                {isUploading ? 'Procesando imagen y guardando...' : '+ Agregar Servicio'}
              </button>
            </form>
            
            <div className="grid gap-4 md:grid-cols-2">
              {servicios.map(svc => (
                <div key={svc.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex gap-4 items-start">
                  <div className="w-20 h-20 bg-neutral-950 rounded border border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {svc.image ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" /> : <span className="text-xs text-neutral-600">Sin foto</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-neutral-200 leading-tight">{svc.name}</h3>
                      <p className="text-white font-bold">${svc.price.toLocaleString('es-AR')}</p>
                    </div>
                    {svc.description && <p className="text-neutral-400 text-sm line-clamp-2 mb-3">{svc.description}</p>}
                    <button onClick={() => handleDeleteServicio(svc.id)} className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 border border-red-500/20 rounded bg-red-500/10 hover:bg-red-500/20 mt-auto">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex text-neutral-50 font-sans selection:bg-neutral-700">
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-2xl font-black tracking-widest text-neutral-100">BATIK</h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Panel de Control</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'inicio', label: '📊 Inicio' },
            { id: 'turnos', label: '🗓️ Turnos Solicitados' },
            { id: 'clientes', label: '👥 Clientes e Historial' },
            { id: 'fechas', label: '📅 Bloquear Fechas' },
            { id: 'horarios', label: '⏰ Horarios' },
            { id: 'servicios', label: '✂️ Servicios y Precios' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === item.id ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <a href="/" target="_blank" className="block w-full text-center py-2 text-sm text-neutral-400 hover:text-white border border-neutral-800 rounded hover:bg-neutral-800 transition">Ver página web ↗</a>
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
