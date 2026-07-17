import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const IMGBB_API_KEY = '9d8cc5a9d9abff0bc9050f7288a07f80';

export default function Dashboard({ salonName }) {
  const [activeTab, setActiveTab] = useState('resumen');
  
  // Data States
  const [peluqueros, setPeluqueros] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [horarios, setHorarios] = useState([]);

  // Form States
  const [nuevoPeluquero, setNuevoPeluquero] = useState({ nombre: '', descripcion: '', file: null });
  const [nuevoServicio, setNuevoServicio] = useState({ name: '', price: '', description: '', file: null });
  const [nuevoTurnoLocal, setNuevoTurnoLocal] = useState({ nombre: '', telefono: '', servicio: '', peluquero: '' });
  const [guardando, setGuardando] = useState(false);

  // Calendario y Horarios UI states
  const todayDate = new Date().toISOString().split('T')[0];
  const [bloqueoMes, setBloqueoMes] = useState(new Date().getMonth());
  const [bloqueoAnio, setBloqueoAnio] = useState(new Date().getFullYear());
  const [horarioFecha, setHorarioFecha] = useState(todayDate);
  const [modoHorario, setModoHorario] = useState('bloquear'); // 'bloquear' o 'agregar'
  const [modoFecha, setModoFecha] = useState('bloquear'); // 'bloquear' o 'desbloquear'

  // Fetch all data
  useEffect(() => {
    const unsubPeluqueros = onSnapshot(collection(db, 'peluqueros'), (snap) => setPeluqueros(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTurnos = onSnapshot(query(collection(db, 'turnos'), orderBy('createdAt', 'desc')), (snap) => setTurnos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFechas = onSnapshot(collection(db, 'fechas_bloqueadas'), (snap) => setFechasBloqueadas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubHorarios = onSnapshot(collection(db, 'horarios'), (snap) => setHorarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubPeluqueros(); unsubServicios(); unsubTurnos(); unsubFechas(); unsubHorarios();
    };
  }, []);

  const uploadImage = async (file) => {
    if (!file) return '';
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error('Error al subir la imagen');
  };

  const handleAgregarPeluquero = async () => {
    if (!nuevoPeluquero.nombre.trim()) return alert("El nombre es requerido");
    setGuardando(true);
    try {
      let fotoUrl = 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=100&h=100&fit=crop';
      if (nuevoPeluquero.file) {
        fotoUrl = await uploadImage(nuevoPeluquero.file);
      }
      await addDoc(collection(db, 'peluqueros'), {
        nombre: nuevoPeluquero.nombre,
        fotoUrl,
        descripcion: nuevoPeluquero.descripcion,
        createdAt: serverTimestamp()
      });
      setNuevoPeluquero({ nombre: '', descripcion: '', file: null });
      document.getElementById('file-peluquero').value = '';
      alert("Peluquero guardado con éxito!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar peluquero.");
    }
    setGuardando(false);
  };

  const handleAgregarServicio = async () => {
    if (!nuevoServicio.name.trim() || !nuevoServicio.price) return alert("Nombre y precio son requeridos");
    setGuardando(true);
    try {
      let image = '';
      if (nuevoServicio.file) {
        image = await uploadImage(nuevoServicio.file);
      }
      await addDoc(collection(db, 'servicios'), {
        name: nuevoServicio.name,
        price: Number(nuevoServicio.price),
        description: nuevoServicio.description,
        image,
        createdAt: serverTimestamp()
      });
      setNuevoServicio({ name: '', price: '', description: '', file: null });
      document.getElementById('file-servicio').value = '';
      alert("Servicio guardado con éxito!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar servicio.");
    }
    setGuardando(false);
  };

  const handleAgregarTurnoLocal = async () => {
    if (!nuevoTurnoLocal.nombre || !nuevoTurnoLocal.servicio || !nuevoTurnoLocal.peluquero) return alert("Completa los datos");
    setGuardando(true);
    try {
      await addDoc(collection(db, 'turnos'), {
        nombre: nuevoTurnoLocal.nombre,
        telefono: nuevoTurnoLocal.telefono,
        service: nuevoTurnoLocal.servicio,
        stylist: nuevoTurnoLocal.peluquero,
        date: new Date().toISOString().split('T')[0],
        time: 'Local',
        origen: 'Local',
        createdAt: serverTimestamp()
      });
      setNuevoTurnoLocal({ nombre: '', telefono: '', servicio: '', peluquero: '' });
      alert("Turno local guardado.");
    } catch (error) {
      console.error(error);
      alert("Error al guardar turno local.");
    }
    setGuardando(false);
  };

  const handleToggleFecha = async (stylist, date) => {
    const existing = fechasBloqueadas.find(f => f.stylist === stylist && f.date === date);
    if (modoFecha === 'bloquear') {
      if (!existing) await addDoc(collection(db, 'fechas_bloqueadas'), { stylist, date });
    } else {
      if (existing) await deleteDoc(doc(db, 'fechas_bloqueadas', existing.id));
    }
  };

  const handleToggleHorario = async (stylist, date, time) => {
    const existing = horarios.find(h => h.stylist === stylist && h.date === date && h.time === time);
    if (modoHorario === 'bloquear') {
      if (existing && existing.type === 'blocked') {
        await deleteDoc(doc(db, 'horarios', existing.id)); // desbloquear
      } else if (existing) {
        // change type? Not supported easily here, let's just delete and recreate
        await deleteDoc(doc(db, 'horarios', existing.id));
        await addDoc(collection(db, 'horarios'), { stylist, date, time, type: 'blocked' });
      } else {
        await addDoc(collection(db, 'horarios'), { stylist, date, time, type: 'blocked' });
      }
    } else {
      // Agregar (custom)
      if (existing && existing.type === 'added') {
        await deleteDoc(doc(db, 'horarios', existing.id));
      } else if (existing) {
        await deleteDoc(doc(db, 'horarios', existing.id));
        await addDoc(collection(db, 'horarios'), { stylist, date, time, type: 'added' });
      } else {
        await addDoc(collection(db, 'horarios'), { stylist, date, time, type: 'added' });
      }
    }
  };

  const handleDeleteTurno = async (id) => {
    if (window.confirm("¿Seguro de eliminar este turno?")) {
      await deleteDoc(doc(db, 'turnos', id));
    }
  };

  const turnosHoy = turnos.filter(t => t.date === todayDate);
  const turnosWeb = turnos.filter(t => t.origen === 'Web');
  const turnosLocales = turnos.filter(t => t.origen === 'Local');

  const defaultTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

  return (
    <div className="dashboard-wrapper">
      <div className="wax-strip"></div>
      <div className="app">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="brand">
            <p className="word display">{salonName.toUpperCase()}</p>
          </div>
          <div className="brand-rule"></div>
          <nav>
            <div className={`nav-item ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
              Resumen General
            </div>
            <div className={`nav-item ${activeTab === 'turnos' ? 'active' : ''}`} onClick={() => setActiveTab('turnos')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
              Turnos Web
            </div>
            <div className={`nav-item ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="18" cy="8.5" r="2.4"/><path d="M15.8 14.3c2.7.3 4.7 2.4 4.7 5.2"/></svg>
              Historial Local
            </div>
            <div className={`nav-item ${activeTab === 'bloqueo' ? 'active' : ''}`} onClick={() => setActiveTab('bloqueo')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14.5l5 5"/></svg>
              Bloqueo de Días
            </div>
            <div className={`nav-item ${activeTab === 'horarios' ? 'active' : ''}`} onClick={() => setActiveTab('horarios')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
              Horarios por Fecha
            </div>
            <div className={`nav-item ${activeTab === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveTab('catalogo')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l12 12M17.6 9L6 20.6"/><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M9.5 12L20 3.5"/></svg>
              Catálogo Servicios
            </div>
            <div className={`nav-item ${activeTab === 'peluqueros' ? 'active' : ''}`} onClick={() => setActiveTab('peluqueros')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"/><path d="M18 8v6M15 11h6"/></svg>
              Peluqueros
            </div>
          </nav>
          <div className="sidebar-foot">
            <div className="user-chip">
              <div className="avatar">AD</div>
              <div>
                <div className="u-name">Admin</div>
                <div className="u-role">Dueño</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main>

          {/* RESUMEN GENERAL */}
          <section className={`page ${activeTab === 'resumen' ? 'active' : ''}`} id="resumen">
            <h1>Resumen del Sistema</h1>
            <p className="lede">Así está {salonName} hoy.</p>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-top"><span className="stat-label">Turnos hoy</span>
                  <div className="stat-icon blue"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3E5C8A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg></div>
                </div>
                <div className="stat-value mono">{turnosHoy.length}</div>
                <div className="stat-trend flat">En el calendario hoy</div>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span className="stat-label">Clientes locales</span>
                  <div className="stat-icon gold"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6423" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><path d="M2.5 19c0-3.3 2.9-5.7 6.5-5.7s6.5 2.4 6.5 5.7"/></svg></div>
                </div>
                <div className="stat-value mono">{turnosLocales.length}</div>
                <div className="stat-trend flat">Total registrados</div>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span className="stat-label">Servicios activos</span>
                  <div className="stat-icon moss"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4C7A63" strokeWidth="2" strokeLinecap="round"><path d="M6 9l12 12M17.6 9L6 20.6"/><circle cx="6" cy="6" r="2"/></svg></div>
                </div>
                <div className="stat-value mono">{servicios.length}</div>
                <div className="stat-trend flat">En el catálogo</div>
              </div>
            </div>

            <div className="dash-grid">
              <div className="panel">
                <h3>Próximos turnos de hoy</h3>
                <p className="panel-sub">Los que vienen ahora — sin tener que abrir Turnos Web.</p>
                {turnosHoy.length === 0 ? (
                  <div className="empty" style={{padding: '20px'}}>No hay turnos agendados para hoy.</div>
                ) : (
                  turnosHoy.map(t => (
                    <div className="today-row" key={t.id}>
                      <div className="today-time mono">{t.time}</div>
                      <div className="today-info"><b>{t.nombre}</b><div>{t.service} — con {t.stylist}</div></div>
                      <div className="today-tag">Confirmado</div>
                    </div>
                  ))
                )}
              </div>
              <div className="panel">
                <h3>Accesos rápidos</h3>
                <p className="panel-sub">Lo que más se usa día a día.</p>
                <div className="quick-actions">
                  <div className="qa-btn" onClick={() => setActiveTab('bloqueo')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Bloquear un día</div>
                  <div className="qa-btn" onClick={() => setActiveTab('catalogo')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l12 12M17.6 9L6 20.6"/></svg>Nuevo servicio</div>
                  <div className="qa-btn" onClick={() => setActiveTab('historial')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><path d="M2.5 19c0-3.3 2.9-5.7 6.5-5.7s6.5 2.4 6.5 5.7"/></svg>Registrar corte sin turno</div>
                </div>
              </div>
            </div>
          </section>

          {/* TURNOS WEB */}
          <section className={`page ${activeTab === 'turnos' ? 'active' : ''}`} id="turnos">
            <h1>Turnos Solicitados</h1>
            <p className="lede">Los turnos que reservaron tus clientes desde la web de {salonName}.</p>
            <div className="table-card">
              <table>
                <thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Servicio</th><th>Peluquero</th><th>Acción</th></tr></thead>
                <tbody>
                  {turnosWeb.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>No hay turnos solicitados vía web.</td></tr>
                  ) : (
                    turnosWeb.map(t => (
                      <tr key={t.id}>
                        <td className="mono">{t.date?.split('-').reverse().join('/')} · {t.time}</td>
                        <td>{t.nombre}</td>
                        <td>{t.service}</td>
                        <td>{t.stylist}</td>
                        <td><button className="btn-cancel" onClick={() => handleDeleteTurno(t.id)}>Cancelar</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* HISTORIAL LOCAL */}
          <section className={`page ${activeTab === 'historial' ? 'active' : ''}`} id="historial">
            <h1>Clientes Locales e Historial</h1>
            <p className="lede">Cargá un corte hecho en el local, sin turno reservado desde la web.</p>
            <div className="panel">
              <h3 style={{marginBottom:'16px'}}>Ingresar corte sin turno</h3>
              <div className="form-grid">
                <div className="field">
                  <label>Nombre</label>
                  <input placeholder="Nombre del cliente" value={nuevoTurnoLocal.nombre} onChange={e => setNuevoTurnoLocal({...nuevoTurnoLocal, nombre: e.target.value})} />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input placeholder="Opcional" value={nuevoTurnoLocal.telefono} onChange={e => setNuevoTurnoLocal({...nuevoTurnoLocal, telefono: e.target.value})} />
                </div>
                <div className="field">
                  <label>Servicio</label>
                  <select value={nuevoTurnoLocal.servicio} onChange={e => setNuevoTurnoLocal({...nuevoTurnoLocal, servicio: e.target.value})}>
                    <option value="">Selecciona...</option>
                    {servicios.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Peluquero</label>
                  <select value={nuevoTurnoLocal.peluquero} onChange={e => setNuevoTurnoLocal({...nuevoTurnoLocal, peluquero: e.target.value})}>
                    <option value="">Selecciona...</option>
                    {peluqueros.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn-primary" onClick={handleAgregarTurnoLocal} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cliente'}</button>
            </div>

            <div className="table-card" style={{marginTop:'20px'}}>
              <table>
                <thead><tr><th>Cliente</th><th>Servicio</th><th>Peluquero</th><th>Fecha</th><th>Acción</th></tr></thead>
                <tbody>
                  {turnosLocales.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign:'center', padding:'30px', color:'var(--muted)'}}>No hay historial de clientes locales.</td></tr>
                  ) : (
                    turnosLocales.map(t => (
                      <tr key={t.id}>
                        <td>{t.nombre}</td>
                        <td>{t.service}</td>
                        <td>{t.stylist}</td>
                        <td className="mono">{t.date?.split('-').reverse().join('/')}</td>
                        <td><button className="btn-cancel" onClick={() => handleDeleteTurno(t.id)}>Eliminar</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* BLOQUEO DE DIAS */}
          <section className={`page ${activeTab === 'bloqueo' ? 'active' : ''}`} id="bloqueo">
            <h1>Gestión de Fechas por Peluquero</h1>
            <p className="lede">Bloqueá un día para que ningún cliente pueda reservar en la web o abrí un día cerrado.</p>
            <div className="cal-grid">
              {peluqueros.length === 0 ? (
                <div className="empty" style={{gridColumn: '1 / -1'}}>No hay peluqueros configurados. Agrega uno en la sección de Peluqueros.</div>
              ) : (
                peluqueros.map(p => {
                  const daysInMonth = new Date(bloqueoAnio, bloqueoMes + 1, 0).getDate();
                  const firstDayIndex = new Date(bloqueoAnio, bloqueoMes, 1).getDay();
                  const days = [];
                  for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="day muted"></div>);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${bloqueoAnio}-${String(bloqueoMes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isBlocked = fechasBloqueadas.some(f => f.stylist === p.nombre && f.date === dateStr);
                    days.push(
                      <div key={d} onClick={() => handleToggleFecha(p.nombre, dateStr)} className={`day ${isBlocked ? 'blocked' : ''}`}>
                        {d}
                      </div>
                    );
                  }
                  
                  return (
                    <div className="cal-card" key={p.id}>
                      <div className="cal-head"><h3>Agenda de {p.nombre}</h3></div>
                      <div className="seg">
                        <button className={modoFecha === 'bloquear' ? 'on' : ''} onClick={() => setModoFecha('bloquear')}>Bloquear fecha</button>
                        <button className={modoFecha === 'desbloquear' ? 'on' : ''} onClick={() => setModoFecha('desbloquear')}>Desbloquear fecha</button>
                      </div>
                      <div className="cal-nav" style={{justifyContent:'space-between', marginBottom:'10px'}}>
                        <button onClick={() => { if(bloqueoMes === 0){setBloqueoMes(11);setBloqueoAnio(bloqueoAnio-1)}else{setBloqueoMes(bloqueoMes-1)} }}>‹</button>
                        <span className="month-label">{monthNames[bloqueoMes]} {bloqueoAnio}</span>
                        <button onClick={() => { if(bloqueoMes === 11){setBloqueoMes(0);setBloqueoAnio(bloqueoAnio+1)}else{setBloqueoMes(bloqueoMes+1)} }}>›</button>
                      </div>
                      <div className="dow-row">{daysOfWeek.map(d => <span key={d}>{d}</span>)}</div>
                      <div className="day-grid">{days}</div>
                      <div className="legend"><span><i className="dot" style={{background:'var(--brick)'}}></i>Bloqueado</span><span><i className="dot" style={{background:'var(--line)'}}></i>Disponible</span></div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* HORARIOS */}
          <section className={`page ${activeTab === 'horarios' ? 'active' : ''}`} id="horarios">
            <h1>Gestión de Horarios</h1>
            <p className="lede">Elegí una fecha y bloqueá horarios o agregá turnos extra.</p>
            <div className="panel" style={{marginBottom:'20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div className="field" style={{width:'220px'}}><label>Fecha</label><input type="date" value={horarioFecha} onChange={(e) => setHorarioFecha(e.target.value)} /></div>
              <div className="pill" style={{background:'var(--brick-bg)', color:'var(--brick)'}}>{horarioFecha?.split('-').reverse().join('/')}</div>
            </div>
            <div className="cal-grid">
              {peluqueros.length === 0 ? (
                 <div className="empty" style={{gridColumn: '1 / -1'}}>No hay peluqueros configurados.</div>
              ) : (
                peluqueros.map(p => {
                  const pHorarios = horarios.filter(h => h.stylist === p.nombre && h.date === horarioFecha);
                  const pBloqueados = pHorarios.filter(h => h.type === 'blocked').map(h => h.time);
                  const pAgregados = pHorarios.filter(h => h.type === 'added').map(h => h.time);
                  const activeTimes = Array.from(new Set([...defaultTimes, ...pAgregados])).sort();

                  return (
                    <div className="cal-card" key={`horario-${p.id}`}>
                      <div className="cal-head"><h3>Horarios de {p.nombre}</h3></div>
                      <div className="seg">
                        <button className={modoHorario === 'bloquear' ? 'on' : ''} onClick={() => setModoHorario('bloquear')}>Bloquear</button>
                        <button className={modoHorario === 'agregar' ? 'on' : ''} onClick={() => setModoHorario('agregar')}>Agregar Extra</button>
                      </div>
                      <div className="slot-grid">
                        {modoHorario === 'agregar' && (
                          <div className="slot add" onClick={() => {
                            const nt = window.prompt("Nuevo horario (Ej: 09:30 o 20:00)");
                            if(nt) handleToggleHorario(p.nombre, horarioFecha, nt);
                          }}>+</div>
                        )}
                        {activeTimes.map(t => {
                          const isBlocked = pBloqueados.includes(t);
                          return (
                            <div key={t} className={`slot ${isBlocked ? 'blocked' : ''}`} onClick={() => handleToggleHorario(p.nombre, horarioFecha, t)}>
                              {t}
                            </div>
                          );
                        })}
                      </div>
                      <div className="legend"><span><i className="dot" style={{background:'var(--brick)'}}></i>Bloqueado</span><span><i className="dot" style={{background:'#fff', border:'1px solid var(--line)'}}></i>Disponible</span></div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* CATALOGO */}
          <section className={`page ${activeTab === 'catalogo' ? 'active' : ''}`} id="catalogo">
            <h1>Servicios y Precios</h1>
            <p className="lede">Lo que cargues acá se ve reflejado en la web pública de {salonName}.</p>
            <div className="panel">
              <h3 style={{marginBottom:'16px'}}>Nuevo servicio</h3>
              <div className="form-grid">
                <div className="field"><label>Nombre del servicio</label><input placeholder="Ej: Corte + barba" value={nuevoServicio.name} onChange={e => setNuevoServicio({...nuevoServicio, name: e.target.value})} /></div>
                <div className="field"><label>Precio</label><input type="number" placeholder="Ej: 10000" value={nuevoServicio.price} onChange={e => setNuevoServicio({...nuevoServicio, price: e.target.value})} /></div>
              </div>
              <div className="field" style={{marginBottom:'16px'}}>
                <label>Foto del servicio</label>
                <div className="upload-box" style={{position: 'relative'}}>
                  <input type="file" id="file-servicio" style={{position:'absolute', opacity:0, width:'100%', height:'100%', cursor:'pointer'}} accept="image/*" onChange={e => setNuevoServicio({...nuevoServicio, file: e.target.files[0]})} />
                  <button type="button" className="upload-btn">{nuevoServicio.file ? 'Foto cargada' : 'Elegir foto'}</button>
                  <span className="hint">{nuevoServicio.file ? nuevoServicio.file.name : 'Se subirá a ImgBB'}</span>
                </div>
              </div>
              <div className="field" style={{marginBottom:'18px'}}>
                <label>Descripción</label>
                <textarea rows={3} placeholder="Contale al cliente qué incluye este servicio..." value={nuevoServicio.description} onChange={e => setNuevoServicio({...nuevoServicio, description: e.target.value})}></textarea>
              </div>
              <button className="btn-primary gold" onClick={handleAgregarServicio} disabled={guardando}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {guardando ? 'Guardando...' : 'Guardar servicio'}
              </button>
            </div>

            <div className="card-grid">
              {servicios.length === 0 && <div className="empty" style={{gridColumn: '1 / -1'}}>No hay servicios.</div>}
              {servicios.map(s => (
                <div className="item-card" key={s.id}>
                  {s.image ? (
                    <img className="item-photo" src={s.image} alt={s.name} />
                  ) : (
                    <div className="item-photo" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Sin foto</div>
                  )}
                  <div className="item-body">
                    <div className="name">{s.name}</div>
                    <div className="desc">{s.description || 'Sin descripción.'}</div>
                    <div className="item-price">${s.price.toLocaleString('es-AR')}</div>
                    <div className="item-actions">
                      <div className="icon-btn" onClick={async () => { if(window.confirm('Eliminar?')) await deleteDoc(doc(db, 'servicios', s.id)); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PELUQUEROS */}
          <section className={`page ${activeTab === 'peluqueros' ? 'active' : ''}`} id="peluqueros">
            <h1>Peluqueros</h1>
            <p className="lede">Sumá o dá de baja a los profesionales que trabajan en {salonName}.</p>

            <div className="panel">
              <h3 style={{marginBottom:'16px'}}>Agregar peluquero</h3>
              <div className="field" style={{marginBottom:'16px'}}>
                <label>Nombre</label>
                <input 
                  placeholder="Ej: Camila Suárez" 
                  value={nuevoPeluquero.nombre} 
                  onChange={(e) => setNuevoPeluquero({...nuevoPeluquero, nombre: e.target.value})} 
                />
              </div>
              <div className="field" style={{marginBottom:'16px'}}>
                <label>Foto de perfil</label>
                <div className="upload-box" style={{position: 'relative'}}>
                  <input type="file" id="file-peluquero" style={{position:'absolute', opacity:0, width:'100%', height:'100%', cursor:'pointer'}} accept="image/*" onChange={e => setNuevoPeluquero({...nuevoPeluquero, file: e.target.files[0]})} />
                  <button type="button" className="upload-btn">{nuevoPeluquero.file ? 'Foto cargada' : 'Elegir foto'}</button>
                  <span className="hint">{nuevoPeluquero.file ? nuevoPeluquero.file.name : 'Se subirá a ImgBB'}</span>
                </div>
              </div>
              <div className="field" style={{marginBottom:'18px'}}>
                <label>Descripción</label>
                <textarea 
                  rows={3} 
                  placeholder="Ej: Especialista en color y trenzas, 8 años de experiencia."
                  value={nuevoPeluquero.descripcion}
                  onChange={(e) => setNuevoPeluquero({...nuevoPeluquero, descripcion: e.target.value})} 
                ></textarea>
              </div>
              <button className="btn-primary gold" onClick={handleAgregarPeluquero} disabled={guardando}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {guardando ? 'Guardando...' : 'Guardar peluquero'}
              </button>
            </div>

            <div className="card-grid">
              {peluqueros.length === 0 && <div className="empty" style={{gridColumn: '1 / -1'}}>No hay peluqueros.</div>}
              {peluqueros.map(p => (
                <div className="item-card" key={p.id}>
                  <img className="stylist-avatar" src={p.fotoUrl} alt={p.nombre} />
                  <img className="stylist-round" src={p.fotoUrl} alt="" />
                  <div className="stylist-body">
                    <div className="name">{p.nombre}</div>
                    <div className="desc">{p.descripcion || 'Sin descripción.'}</div>
                    <div className="item-actions" style={{justifyContent:'center'}}>
                      <div className="icon-btn" onClick={async () => { if(window.confirm('Eliminar?')) await deleteDoc(doc(db, 'peluqueros', p.id)); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
