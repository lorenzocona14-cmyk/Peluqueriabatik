import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Dashboard({ salonName }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [peluqueros, setPeluqueros] = useState([]);
  const [nuevoPeluquero, setNuevoPeluquero] = useState({ nombre: '', fotoUrl: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);

  // Escuchar peluqueros desde Firebase
  useEffect(() => {
    const q = collection(db, 'peluqueros');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const peluquerosList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPeluqueros(peluquerosList);
    });
    return () => unsubscribe();
  }, []);

  const handleAgregarPeluquero = async () => {
    if (!nuevoPeluquero.nombre.trim()) return alert("El nombre es requerido");
    setGuardando(true);
    try {
      await addDoc(collection(db, 'peluqueros'), {
        nombre: nuevoPeluquero.nombre,
        fotoUrl: nuevoPeluquero.fotoUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=100&h=100&fit=crop', // default si no cargan foto
        descripcion: nuevoPeluquero.descripcion,
        createdAt: serverTimestamp()
      });
      setNuevoPeluquero({ nombre: '', fotoUrl: '', descripcion: '' });
      alert("Peluquero guardado con éxito!");
    } catch (error) {
      console.error("Error agregando peluquero:", error);
      alert("Error al guardar peluquero.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="wax-strip"></div>
      <div className="app">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="brand">
            <p className="word display">{salonName.toUpperCase()}</p>
            <p className="sub">Admin Panel</p>
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
              <span style={{marginLeft:'auto', background:'var(--gold)', color:'var(--ink)', fontSize:'9.5px', fontWeight:'700', padding:'2px 6px', borderRadius:'5px'}}>NUEVO</span>
            </div>
          </nav>
          <div className="sidebar-foot">
            <div className="user-chip">
              <div className="avatar">AD</div>
              <div>
                <div className="u-name">Admin</div>
                <div className="u-role">Dueño</div>
              </div>
              <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 9l4 4 4-4"/></svg>
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
                <div className="stat-value mono">3</div>
                <div className="stat-trend">↑ 2 más que ayer</div>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span className="stat-label">Clientes locales</span>
                  <div className="stat-icon gold"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6423" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><path d="M2.5 19c0-3.3 2.9-5.7 6.5-5.7s6.5 2.4 6.5 5.7"/></svg></div>
                </div>
                <div className="stat-value mono">18</div>
                <div className="stat-trend flat">Total registrados</div>
              </div>
              <div className="stat-card">
                <div className="stat-top"><span className="stat-label">Servicios activos</span>
                  <div className="stat-icon moss"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4C7A63" strokeWidth="2" strokeLinecap="round"><path d="M6 9l12 12M17.6 9L6 20.6"/><circle cx="6" cy="6" r="2"/></svg></div>
                </div>
                <div className="stat-value mono">1</div>
                <div className="stat-trend flat">En el catálogo</div>
              </div>
            </div>

            <div className="dash-grid">
              <div className="panel">
                <h3>Próximos turnos de hoy</h3>
                <p className="panel-sub">Los que vienen ahora — sin tener que abrir Turnos Web.</p>
                <div className="today-row">
                  <div className="today-time mono">10:30</div>
                  <div className="today-info"><b>Marcos Ibáñez</b><div>Corte de pelo (Hombre) — con Nico</div></div>
                  <div className="today-tag">Confirmado</div>
                </div>
                <div className="today-row">
                  <div className="today-time mono">11:00</div>
                  <div className="today-info"><b>Ariana Molina</b><div>Coloración — con Eze</div></div>
                  <div className="today-tag">Confirmado</div>
                </div>
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
                  <tr>
                    <td className="mono">15/07 · 10:30</td>
                    <td>Marcos Ibáñez</td>
                    <td>Corte de pelo (Hombre)</td>
                    <td>Nico</td>
                    <td><button className="btn-cancel">Cancelar</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint" style={{marginTop:'10px', fontSize:'12px', color:'var(--muted)'}}>Al cancelar, se le avisa automáticamente al cliente por WhatsApp.</p>
          </section>

          {/* HISTORIAL LOCAL */}
          <section className={`page ${activeTab === 'historial' ? 'active' : ''}`} id="historial">
            <h1>Clientes Locales e Historial</h1>
            <p className="lede">Cargá un corte hecho en el local, sin turno reservado desde la web.</p>
            <div className="panel">
              <h3 style={{marginBottom:'16px'}}>Ingresar corte sin turno</h3>
              <div className="form-grid">
                <div className="field"><label>Nombre</label><input placeholder="Nombre del cliente" /></div>
                <div className="field"><label>Teléfono</label><input placeholder="011 1234 5678" /></div>
                <div className="field">
                  <label>Servicio</label>
                  <select><option>Corte de pelo (Hombre)</option></select>
                </div>
                <div className="field">
                  <label>Peluquero</label>
                  <select>
                    {peluqueros.map(p => <option key={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn-primary">Guardar cliente</button>
            </div>
          </section>

          {/* BLOQUEO DE DIAS */}
          <section className={`page ${activeTab === 'bloqueo' ? 'active' : ''}`} id="bloqueo">
            <h1>Gestión de Fechas por Peluquero</h1>
            <p className="lede">Bloqueá un día para que ningún cliente pueda reservar en la web.</p>
            <div className="cal-grid">
              {peluqueros.length === 0 ? (
                <div className="empty" style={{gridColumn: '1 / -1'}}>No hay peluqueros configurados. Agrega uno en la sección de Peluqueros.</div>
              ) : (
                peluqueros.map(p => (
                  <div className="cal-card" key={p.id}>
                    <div className="cal-head"><h3>Agenda de {p.nombre}</h3></div>
                    <div className="seg"><button className="on">Bloquear fecha</button><button>Agregar fecha</button></div>
                    <div className="cal-nav" style={{justifyContent:'space-between', marginBottom:'10px'}}>
                      <button>‹</button><span className="month-label">Agosto 2026</span><button>›</button>
                    </div>
                    <div className="dow-row"><span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span></div>
                    <div className="day-grid">
                      <div className="day muted"></div><div className="day muted"></div><div className="day muted"></div><div className="day muted"></div><div className="day muted"></div><div className="day muted"></div><div className="day">1</div>
                      <div className="day">2</div><div className="day">3</div><div className="day">4</div><div className="day">5</div><div className="day">6</div><div className="day">7</div><div className="day">8</div>
                      <div className="day">9</div><div className="day">10</div><div className="day">11</div><div className="day blocked">12</div><div className="day">13</div><div className="day">14</div><div className="day">15</div>
                      <div className="day">16</div><div className="day">17</div><div className="day">18</div><div className="day">19</div><div className="day">20</div><div className="day">21</div><div className="day">22</div>
                      <div className="day">23</div><div className="day">24</div><div className="day">25</div><div className="day">26</div><div className="day">27</div><div className="day">28</div><div className="day">29</div>
                      <div className="day">30</div><div className="day">31</div>
                    </div>
                    <div className="legend"><span><i className="dot" style={{background:'var(--brick)'}}></i>Bloqueado</span><span><i className="dot" style={{background:'var(--line)'}}></i>Sin turnos web</span></div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* HORARIOS */}
          <section className={`page ${activeTab === 'horarios' ? 'active' : ''}`} id="horarios">
            <h1>Gestión de Horarios</h1>
            <p className="lede">Elegí una fecha y bloqueá los horarios puntuales que no estén disponibles.</p>
            <div className="panel" style={{marginBottom:'20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div className="field" style={{width:'220px'}}><label>Fecha</label><input type="date" defaultValue="2026-08-14" /></div>
              <div className="pill" style={{background:'var(--brick-bg)', color:'var(--brick)'}}>Hoy · 14/08/2026</div>
            </div>
            <div className="cal-grid">
              {peluqueros.length === 0 ? (
                 <div className="empty" style={{gridColumn: '1 / -1'}}>No hay peluqueros configurados.</div>
              ) : (
                peluqueros.map(p => (
                  <div className="cal-card" key={`horario-${p.id}`}>
                    <div className="cal-head"><h3>Horarios de {p.nombre}</h3></div>
                    <div className="seg"><button className="on">Bloquear</button><button>Modificar</button></div>
                    <div className="slot-grid">
                      <div className="slot add">+</div><div className="slot">10:00</div><div className="slot">10:30</div><div className="slot">11:00</div>
                      <div className="slot">11:30</div><div className="slot">12:00</div><div className="slot">12:30</div><div className="slot">13:00</div>
                      <div className="slot blocked">13:30</div><div className="slot">14:00</div><div className="slot">14:30</div><div className="slot">15:00</div>
                    </div>
                    <div className="legend"><span><i className="dot" style={{background:'var(--brick)'}}></i>Bloqueado</span><span><i className="dot" style={{background:'#fff', border:'1px solid var(--line)'}}></i>Disponible</span></div>
                  </div>
                ))
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
                <div className="field"><label>Nombre del servicio</label><input placeholder="Ej: Corte + barba" /></div>
                <div className="field"><label>Precio</label><input placeholder="$ 10.000" /></div>
              </div>
              <div className="field" style={{marginBottom:'16px'}}>
                <label>Foto del servicio</label>
                <div className="upload-box">
                  <button className="upload-btn">Elegir foto</button>
                  <span className="hint">Sin archivo seleccionado · se muestra en la web pública</span>
                </div>
              </div>
              <div className="field" style={{marginBottom:'18px'}}><label>Descripción</label><textarea rows={3} placeholder="Contale al cliente qué incluye este servicio..."></textarea></div>
              <button className="btn-primary gold"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Guardar servicio</button>
            </div>
          </section>

          {/* PELUQUEROS */}
          <section className={`page ${activeTab === 'peluqueros' ? 'active' : ''}`} id="peluqueros">
            <h1>Peluqueros</h1>
            <p className="lede">Sumá o dá de baja a los profesionales que trabajan en {salonName}. Cada uno tiene su propia agenda y horarios.</p>

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
                <label>Foto de perfil (URL) Opcional</label>
                <input 
                  placeholder="https://..." 
                  value={nuevoPeluquero.fotoUrl} 
                  onChange={(e) => setNuevoPeluquero({...nuevoPeluquero, fotoUrl: e.target.value})} 
                />
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
              {peluqueros.map(p => (
                <div className="item-card" key={p.id}>
                  <img className="stylist-avatar" src={p.fotoUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=300&fit=crop'} alt={p.nombre} />
                  <img className="stylist-round" src={p.fotoUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=100&h=100&fit=crop'} alt="" />
                  <div className="stylist-body">
                    <div className="name">{p.nombre}</div>
                    <div className="desc">{p.descripcion || 'Sin descripción.'}</div>
                    <div className="item-actions" style={{justifyContent:'center'}}>
                      <div className="icon-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></div>
                      <div className="icon-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></div>
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
