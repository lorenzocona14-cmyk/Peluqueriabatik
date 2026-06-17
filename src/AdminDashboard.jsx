import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const defaultTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

const AdminDashboard = () => {
  // --- SISTEMA DE AUTENTICACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState({ user: '', pass: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (login.user === 'admin' && login.pass === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Usuario o contraseña incorrectos.');
    }
  };

  // --- ESTADOS DEL DASHBOARD ---
  const [activeTab, setActiveTab] = useState('inicio');
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [horariosConfig, setHorariosConfig] = useState([]); 
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selector de fecha específico para la pestaña de Horarios
  const [selectedHorarioDate, setSelectedHorarioDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados de Formularios y Modos de Edición
  const [nuevoServicio, setNuevoServicio] = useState({ name: '', price: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', servicio: '', peluquero: 'Eze' });
  
  const [fechaMode, setFechaMode] = useState({ Eze: 'bloquear', Nico: 'bloquear' });
  const [horaMode, setHoraMode] = useState({ Eze: 'bloquear', Nico: 'bloquear' });

  // Calendario Administrativo
  const today = new Date();
  const [dashMonth, setDashMonth] = useState(today.getMonth());
  const [dashYear, setDashYear] = useState(today.getFullYear());
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

  // --- OBTENCIÓN DE DATOS (FIREBASE) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [servSnap, turnosSnap, horSnap, fechSnap] = await Promise.all([
        getDocs(collection(db, "servicios")),
        getDocs(query(collection(db, "turnos"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "horarios")),
        getDocs(collection(db, "fechas_bloqueadas"))
      ]);
      setServicios(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTurnos(turnosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHorariosConfig(horSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFechasBloqueadas(fechSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error sincronizando base de datos:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [activeTab, isAuthenticated]);

  // --- GESTIÓN DE TURNOS WEB ---
  const handleCancelarTurno = async (turno) => {
    if (window.confirm(`¿Querés cancelar el turno de ${turno.nombre} y avisarle por WhatsApp?`)) {
      try {
        await deleteDoc(doc(db, "turnos", turno.id));
        fetchData();
        const telefonoLimpio = turno.telefono.replace(/\D/g, ''); 
        const mensaje = `Hola ${turno.nombre}, te escribimos de la peluquería Batik. Lamentablemente tuvimos un inconveniente y necesitamos reprogramar o cancelar tu turno del día ${turno.date.split('-').reverse().join('/')} a las ${turno.time} con ${turno.stylist}. Avisanos cómo querés seguir. ¡Disculpas!`;
        window.open(`https://wa.me/549${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
      } catch (error) {
        console.error("Error al cancelar turno:", error);
      }
    }
  };

  // --- GESTIÓN DE CLIENTES MANUALES (LOCAL) ---
  const handleAgregarClienteManual = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nombre || !nuevoCliente.servicio) return;
    try {
      await addDoc(collection(db, "turnos"), {
        nombre: nuevoCliente.nombre,
        telefono: nuevoCliente.telefono || 'Atención Local',
        service: nuevoCliente.servicio,
        stylist: nuevoCliente.peluquero,
        date: new Date().toISOString().split('T')[0],
        time: 'Atención Local',
        origen: 'Local',
        createdAt: new Date()
      });
      setNuevoCliente({ nombre: '', telefono: '', servicio: '', peluquero: 'Eze' });
      fetchData();
      alert("Cliente guardado en el historial con éxito.");
    } catch (error) {
      console.error("Error guardando cliente manual:", error);
    }
  };

  // --- GESTIÓN DE FECHAS (BLOQUEO COMPLETO POR DÍA) ---
  const handleDateClick = async (dateStr, stylist) => {
    const mode = fechaMode[stylist];
    const isBlockedObj = fechasBloqueadas.find(f => f.date === dateStr && f.stylist === stylist);

    try {
      if (mode === 'bloquear' && !isBlockedObj) {
        await addDoc(collection(db, "fechas_bloqueadas"), { date: dateStr, stylist });
        fetchData();
      } else if (mode === 'agregar' && isBlockedObj) {
        await deleteDoc(doc(db, "fechas_bloqueadas", isBlockedObj.id));
        fetchData();
      }
    } catch (error) {
      console.error("Error al modificar fecha:", error);
    }
  };

  // --- GESTIÓN DE HORARIOS FILTRADOS POR CALENDARIO ---
  const handleHoraAction = async (timeStr, stylist) => {
    const config = horariosConfig.filter(h => h.stylist === stylist && h.date === selectedHorarioDate);
    const isDefault = defaultTimes.includes(timeStr);
    const blockedDoc = config.find(h => h.type === 'blocked' && h.time === timeStr);
    const addedDoc = config.find(h => h.type === 'added' && h.time === timeStr);
    const mode = horaMode[stylist];

    try {
      if (mode === 'bloquear') {
        if (blockedDoc) {
          await deleteDoc(doc(db, "horarios", blockedDoc.id));
        } else {
          if (isDefault) {
            await addDoc(collection(db, "horarios"), { time: timeStr, stylist, type: 'blocked', date: selectedHorarioDate });
          } else if (addedDoc) {
            if (window.confirm('¿Eliminar este horario extra permanentemente para este día?')) {
              await deleteDoc(doc(db, "horarios", addedDoc.id));
            }
          }
        }
        fetchData();
      } else if (mode === 'modificar') {
        const newTime = window.prompt(`Modificar horario de las ${timeStr} a:`, timeStr);
        if (newTime && newTime !== timeStr) {
          if (isDefault && !blockedDoc) {
            await addDoc(collection(db, "horarios"), { time: timeStr, stylist, type: 'blocked', date: selectedHorarioDate });
          } else if (addedDoc) {
            await deleteDoc(doc(db, "horarios", addedDoc.id));
          }
          await addDoc(collection(db, "horarios"), { time: newTime, stylist, type: 'added', date: selectedHorarioDate });
          fetchData();
        }
      }
    } catch (error) {
      console.error("Error al procesar acción sobre horario:", error);
    }
  };

  const handleAgregarSlot = async (stylist, recommendedTime = "09:00") => {
    const newTime = window.prompt(`Ingresar nuevo horario para ${stylist} en la fecha seleccionada:`, recommendedTime);
    if (newTime) {
      try {
        await addDoc(collection(db, "horarios"), { time: newTime, stylist, type: 'added', date: selectedHorarioDate });
        fetchData();
      } catch (error) {
        console.error("Error al agregar franja horaria:", error);
      }
    }
  };

  // --- GESTIÓN DE CATÁLOGO DE SERVICIOS ---
  const handleAddServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.name || !nuevoServicio.price) return;
    setIsUploading(true);
    let imageUrl = ''; 
    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const apiKey = '9d8cc5a9d9abff0bc9050f7288a07f80'; 
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const imgbbData = await imgbbRes.json();
        if (imgbbData.success) imageUrl = imgbbData.data.url;
      }
      await addDoc(collection(db, "servicios"), {
        name: nuevoServicio.name, price: Number(nuevoServicio.price),
        description: nuevoServicio.description, image: imageUrl
      });
      setNuevoServicio({ name: '', price: '', description: '' });
      setImageFile(null);
      document.getElementById('imageInput').value = ''; 
      fetchData();
    } catch (error) {
      console.error("Error al subir catálogo:", error);
    }
    setIsUploading(false);
  };

  const handleDeleteServicio = async (id) => {
    if (window.confirm("¿Eliminar este servicio?")) {
      await deleteDoc(doc(db, "servicios", id));
      fetchData();
    }
  };

  // --- AUXILIAR RENDERIZADO CALENDARIO ---
  const renderAdminCalendar = (stylist) => {
    const daysInMonth = new Date(dashYear, dashMonth + 1, 0).getDate();
    const firstDayIndex = new Date(dashYear, dashMonth, 1).getDay();
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(dashYear, dashMonth, d);
      const dateStr = `${dashYear}-${String(dashMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isPast = dateObj < todayMidnight;
      const isClosed = dateObj.getDay() === 0 || dateObj.getDay() === 1; 
      const isBlocked = fechasBloqueadas.some(f => f.date === dateStr && f.stylist === stylist);

      let btnClass = "bg-white border border-gray-200 text-gray-800 hover:bg-gray-100";
      if (isPast || isClosed) btnClass = "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 opacity-50";
      if (isBlocked) btnClass = "bg-red-50 text-red-600 border border-red-200 font-bold line-through";

      days.push(
        <button
          key={d} disabled={isPast || isClosed} type="button"
          onClick={() => handleDateClick(dateStr, stylist)}
          className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm transition mx-auto ${btnClass}`}
        >
          {d}
        </button>
      );
    }
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button type="button" onClick={() => { if(dashMonth === 0){setDashMonth(11);setDashYear(dashYear-1)}else{setDashMonth(dashMonth-1)} }} className="p-2 text-gray-500 hover:text-black transition bg-gray-50 rounded-lg">{'<'}</button>
          <span className="font-bold text-gray-900">{monthNames[dashMonth]} {dashYear}</span>
          <button type="button" onClick={() => { if(dashMonth === 11){setDashMonth(0);setDashYear(dashYear+1)}else{setDashMonth(dashMonth+1)} }} className="p-2 text-gray-500 hover:text-black transition bg-gray-50 rounded-lg">{'>'}</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 mb-3">{daysOfWeek.map(day => <div key={day}>{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-y-2 text-center">{days}</div>
      </div>
    );
  };

  // --- CONTROLADOR DE PESTAÑAS (VISTAS) ---
  const renderContent = () => {
    if (loading && activeTab !== 'servicios') return <div className="text-gray-500 py-10 text-center font-medium">Sincronizando con la base de datos...</div>;

    switch (activeTab) {
      case 'inicio':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Resumen del Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Turnos Web</p>
                <p className="text-5xl font-black text-gray-900 mt-2">{turnos.filter(t => t.origen === 'Web').length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Clientes Locales</p>
                <p className="text-5xl font-black text-gray-900 mt-2">{turnos.filter(t => t.origen === 'Local').length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Servicios Activos</p>
                <p className="text-5xl font-black text-gray-900 mt-2">{servicios.length}</p>
              </div>
            </div>
          </div>
        );

      case 'turnos':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Turnos Solicitados</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-5 font-bold">Fecha y Hora</th>
                    <th className="p-5 font-bold">Cliente</th>
                    <th className="p-5 font-bold">Servicio</th>
                    <th className="p-5 font-bold">Peluquero</th>
                    <th className="p-5 font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {turnos.filter(t => t.origen === 'Web').map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="p-5 font-black text-gray-900">{t.date.split('-').reverse().join('/')} | {t.time}</td>
                      <td className="p-5"><p className="text-gray-900 font-bold">{t.nombre}</p><p className="text-xs text-gray-500">{t.telefono}</p></td>
                      <td className="p-5 font-medium">{t.service}</td>
                      <td className="p-5 font-bold text-gray-900">{t.stylist}</td>
                      <td className="p-5">
                        <button onClick={() => handleCancelarTurno(t)} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition font-bold text-xs shadow-sm">
                          Cancelar y Avisar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {turnos.filter(t => t.origen === 'Web').length === 0 && (
                    <tr><td colSpan="5" className="p-10 text-center font-medium text-gray-500">No hay turnos web registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'clientes':
        return (
          <div className="animate-fade-in space-y-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Clientes Locales e Historial</h2>
            <form onSubmit={handleAgregarClienteManual} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-gray-900 mb-4">Ingresar corte sin turno (Local)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Nombre *" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none" required />
                <input type="text" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none" />
                <select value={nuevoCliente.servicio} onChange={e => setNuevoCliente({...nuevoCliente, servicio: e.target.value})} className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none" required>
                  <option value="">Servicio *</option>
                  {servicios.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <select value={nuevoCliente.peluquero} onChange={e => setNuevoCliente({...nuevoCliente, peluquero: e.target.value})} className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none">
                  <option value="Eze">Eze</option>
                  <option value="Nico">Nico</option>
                </select>
              </div>
              <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition shadow-md">Guardar Cliente Local</button>
            </form>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-5 font-bold">Cliente</th>
                    <th className="p-5 font-bold">Último Servicio</th>
                    <th className="p-5 font-bold">Peluquero</th>
                    <th className="p-5 font-bold">Fecha</th>
                    <th className="p-5 font-bold">Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {turnos.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="p-5 font-bold text-gray-900">{t.nombre} <br/><span className="text-xs text-gray-400 font-normal">{t.telefono}</span></td>
                      <td className="p-5 font-medium">{t.service}</td>
                      <td className="p-5 font-bold">{t.stylist}</td>
                      <td className="p-5 font-medium">{t.date.split('-').reverse().join('/')}</td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${t.origen === 'Web' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
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
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Fechas por Peluquero</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {['Eze', 'Nico'].map(stylist => (
                <div key={stylist} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-2xl font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Agenda de {stylist}</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                    <button onClick={() => setFechaMode({...fechaMode, [stylist]: 'bloquear'})} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${fechaMode[stylist] === 'bloquear' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-900'}`}>
                      Bloquear Fecha
                    </button>
                    <button onClick={() => setFechaMode({...fechaMode, [stylist]: 'agregar'})} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${fechaMode[stylist] === 'agregar' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-900'}`}>
                      Agregar Fecha (Habilitar)
                    </button>
                  </div>
                  {renderAdminCalendar(stylist)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'horarios':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Horarios por Calendario</h2>
            
            {/* Selector global de Fecha para la grilla horaria */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Seleccionar Fecha para configurar:</label>
                <input 
                  type="date" 
                  value={selectedHorarioDate} 
                  onChange={(e) => setSelectedHorarioDate(e.target.value)} 
                  className="p-3 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-black outline-none shadow-sm"
                />
              </div>
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-bold">
                Día seleccionado: <span className="text-red-600">{selectedHorarioDate.split('-').reverse().join('/')}</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {['Eze', 'Nico'].map(stylist => {
                const config = horariosConfig.filter(h => h.stylist === stylist && h.date === selectedHorarioDate);
                const blocked = config.filter(h => h.type === 'blocked').map(h => h.time);
                const added = config.filter(h => h.type === 'added').map(h => h.time);
                const allTimes = Array.from(new Set([...defaultTimes, ...added])).sort();

                return (
                  <div key={stylist} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-2xl font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">Horarios de {stylist}</h3>
                    
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-6 text-sm font-bold">
                      <button onClick={() => setHoraMode({...horaMode, [stylist]: 'bloquear'})} className={`flex-1 py-2 rounded-md transition ${horaMode[stylist] === 'bloquear' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-900'}`}>Bloquear</button>
                      <button onClick={() => setHoraMode({...horaMode, [stylist]: 'modificar'})} className={`flex-1 py-2 rounded-md transition ${horaMode[stylist] === 'modificar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Modificar</button>
                    </div>

                    {horaMode[stylist] === 'bloquear' && <p className="text-xs text-red-500 font-bold mb-4">Tocá un horario para inhabilitarlo en esta fecha.</p>}
                    {horaMode[stylist] === 'modificar' && <p className="text-xs text-blue-500 font-bold mb-4">Tocá un horario para cambiar su inicio en esta fecha.</p>}

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                      {/* Botón + a la izquierda (Horarios más temprano) */}
                      <button onClick={() => handleAgregarSlot(stylist, "09:30")} className="py-3 rounded-lg text-center font-black transition border border-dashed border-gray-400 text-gray-500 hover:text-gray-900 hover:border-gray-900 bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs ml-1 font-bold">Temprano</span>
                      </button>

                      {allTimes.map(timeStr => {
                        const isBlocked = blocked.includes(timeStr);
                        let btnClass = isBlocked 
                          ? "bg-red-50 text-red-500 border-red-200 line-through opacity-60 font-medium" 
                          : "bg-white text-gray-900 border-gray-200 hover:border-gray-400";

                        return (
                          <button 
                            key={timeStr} 
                            onClick={() => handleHoraAction(timeStr, stylist)}
                            className={`py-3 rounded-lg text-center font-black transition border shadow-sm ${btnClass}`}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                      
                      {/* Botón + a la derecha (Horarios más tarde) */}
                      <button onClick={() => handleAgregarSlot(stylist, "18:30")} className="py-3 rounded-lg text-center font-black transition border border-dashed border-gray-400 text-gray-500 hover:text-gray-900 hover:border-gray-900 bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'servicios':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Servicios y Precios</h2>
            <form onSubmit={handleAddServicio} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input type="text" placeholder="Nombre del Servicio *" value={nuevoServicio.name} onChange={(e) => setNuevoServicio({...nuevoServicio, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none font-medium" required />
                <input type="number" placeholder="Precio ($) *" value={nuevoServicio.price} onChange={(e) => setNuevoServicio({...nuevoServicio, price: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-black outline-none font-medium" required />
              </div>
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <label className="block text-sm font-bold text-gray-700 mb-2">Subir Foto (Obligatorio)</label>
                <input id="imageInput" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-black file:bg-gray-900 file:text-white hover:file:bg-black cursor-pointer" />
              </div>
              <textarea placeholder="Descripción del servicio..." value={nuevoServicio.description} onChange={(e) => setNuevoServicio({...nuevoServicio, description: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 min-h-[100px] focus:ring-2 focus:ring-black outline-none" />
              <button type="submit" disabled={isUploading} className={`w-full py-4 rounded-lg font-black text-lg transition shadow-md ${isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}>
                {isUploading ? 'Procesando...' : 'Guardar Nuevo Servicio'}
              </button>
            </form>
            
            <div className="grid gap-6 md:grid-cols-2">
              {servicios.map(svc => (
                <div key={svc.id} className="bg-white p-5 rounded-xl border border-gray-200 flex gap-5 items-start shadow-sm">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {svc.image ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 font-bold">SIN FOTO</span>}
                  </div>
                  <div className="flex-1 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-gray-900 text-lg leading-tight">{svc.name}</h3>
                      <p className="text-gray-900 font-black bg-gray-100 px-2 py-1 rounded border border-gray-200">${svc.price.toLocaleString('es-AR')}</p>
                    </div>
                    {svc.description && <p className="text-gray-500 text-sm line-clamp-2 mb-3">{svc.description}</p>}
                    <button onClick={() => handleDeleteServicio(svc.id)} className="mt-auto text-red-600 hover:text-red-700 text-xs font-black px-3 py-2 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 self-start transition">ELIMINAR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  // --- INTERFAZ DEL LOGIN SEGURO ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans selection:bg-red-200">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-sm space-y-5 border border-gray-200/60">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tighter text-gray-900">BATIK ADMIN</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Panel de Control Seguro</p>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Usuario" 
              className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-black outline-none font-semibold text-gray-900 transition" 
              onChange={e => setLogin({...login, user: e.target.value})} 
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 focus:ring-2 focus:ring-black outline-none font-semibold text-gray-900 transition" 
              onChange={e => setLogin({...login, pass: e.target.value})} 
              required
            />
          </div>
          <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg hover:bg-red-700 transition shadow-lg shadow-red-600/20 tracking-wide">
            INGRESSAR
          </button>
        </form>
      </div>
    );
  }

  // --- INTERFAZ PRINCIPAL DEL DASHBOARD CLARO ---
  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans selection:bg-gray-200">
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 hidden md:flex shadow-sm z-10">
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900">BATIK</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-bold">Admin Panel</p>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'inicio', label: '📊 Resumen General' },
            { id: 'turnos', label: '🗓️ Turnos Web' },
            { id: 'clientes', label: '👥 Historial Local' },
            { id: 'fechas', label: '📅 Bloqueo de Días' },
            { id: 'horarios', label: '⏰ Horarios por Fecha' },
            { id: 'servicios', label: '✂️ Catálogo Servicios' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full text-left px-5 py-4 rounded-xl font-bold transition flex items-center gap-3 ${activeTab === item.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-gray-100">
          <a href="/" target="_blank" className="block w-full text-center py-3 text-sm text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition border border-gray-200">Ir a la Web ↗</a>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
