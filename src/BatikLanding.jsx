import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from './firebase'; 

const BatikLanding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [occupiedTimes, setOccupiedTimes] = useState([]);
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  // ESTADOS QUE CONSUMEN FIREBASE
  const [dbServices, setDbServices] = useState([]);
  const [dbHorarios, setDbHorarios] = useState([]); // Ahora es una lista de objetos {stylist, time}
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [bookingData, setBookingData] = useState({
    service: '', stylist: '', date: '', time: '',
    clientName: '', clientPhone: '', clientEmail: ''
  });
  
  const stylists = [
    { name: 'Eze', photoPlaceholder: 'Foto Eze' },
    { name: 'Nico', photoPlaceholder: 'Foto Nico' }
  ];

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

  // 1. CARGAR CONFIGURACIÓN GLOBAL (Servicios, Horarios, Fechas Bloqueadas)
  useEffect(() => {
    const fetchGlobalConfig = async () => {
      try {
        const servSnap = await getDocs(collection(db, "servicios"));
        setDbServices(servSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const horSnap = await getDocs(collection(db, "horarios"));
        const timesArr = horSnap.docs.map(doc => doc.data());
        timesArr.sort((a, b) => a.time.localeCompare(b.time)); // Ordenar por hora
        setDbHorarios(timesArr);

        const blockSnap = await getDocs(collection(db, "fechas_bloqueadas"));
        setBlockedDates(blockSnap.docs.map(doc => doc.data()));

      } catch (error) {
        console.error("Error al cargar config:", error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchGlobalConfig();
  }, []);

  // 2. BUSCAR HORARIOS OCUPADOS DEL DÍA
  useEffect(() => {
    const fetchOccupiedTimes = async () => {
      if (bookingData.date && bookingData.stylist) {
        const q = query(collection(db, "turnos"), where("date", "==", bookingData.date), where("stylist", "==", bookingData.stylist));
        const querySnapshot = await getDocs(q);
        const times = [];
        querySnapshot.forEach((doc) => times.push(doc.data().time));
        setOccupiedTimes(times);
      }
    };
    fetchOccupiedTimes();
  }, [bookingData.date, bookingData.stylist]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  
  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "turnos"), {
        service: bookingData.service, stylist: bookingData.stylist,
        date: bookingData.date, time: bookingData.time,
        nombre: bookingData.clientName, telefono: bookingData.clientPhone, correo: bookingData.clientEmail,
        origen: 'Web', createdAt: new Date()
      });

      const N8N_WEBHOOK_URL = 'TU_TEST_URL_DE_N8N_AQUI'; 
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: bookingData.service, stylist: bookingData.stylist,
          date: bookingData.date, time: bookingData.time,
          nombre: bookingData.clientName, telefono: bookingData.clientPhone, correo: bookingData.clientEmail
        })
      });

      alert('¡Turno confirmado con éxito!');
      setStep(1);
      setBookingData({ service: '', stylist: '', date: '', time: '', clientName: '', clientPhone: '', clientEmail: '' });
    } catch (error) {
      alert('Hubo un error al procesar el turno. Intentá de nuevo.');
    }
    setLoading(false);
  };

  const selectedServiceObj = dbServices.find(s => s.name === bookingData.service);

  // Filtrar los horarios que correspondan SÓLO al peluquero elegido
  const horariosDisponibles = dbHorarios
    .filter(h => h.stylist === bookingData.stylist)
    .map(h => h.time);

  const renderCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);

    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const maxDate = new Date(); maxDate.setDate(todayMidnight.getDate() + 14); maxDate.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isPast = dateObj < todayMidnight;
      const isBeyondMax = dateObj > maxDate;
      const isClosed = dateObj.getDay() === 0 || dateObj.getDay() === 1; // Domingos y Lunes cerrados
      
      // CHEQUEAR BLOQUEO INDIVIDUAL O TOTAL
      const isBlocked = blockedDates.some(b => b.date === dateStr && (b.stylist === 'Todos' || b.stylist === bookingData.stylist));
      
      const isSelectable = !isPast && !isBeyondMax && !isClosed && !isBlocked;
      const isSelected = bookingData.date === dateStr;

      days.push(
        <button
          key={d} disabled={!isSelectable} type="button"
          onClick={() => setBookingData({...bookingData, date: dateStr, time: ''})}
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition mx-auto ${
            isSelected ? 'bg-neutral-200 text-neutral-900 font-bold shadow-md' 
            : isSelectable ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-600 border border-neutral-700' 
            : 'text-neutral-600 cursor-not-allowed opacity-40'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-sans selection:bg-neutral-700">
      <nav className="fixed top-0 w-full bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-widest">BATIK</div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-neutral-400">
            <a href="#home" className="hover:text-white transition">Home</a>
            <a href="#turnos" className="hover:text-white transition">Turnos</a>
            <a href="#servicios-lista" className="hover:text-white transition">Servicios</a>
            <a href="#contacto" className="hover:text-white transition">Contacto</a>
          </div>
        </div>
      </nav>

      <section id="home" className="pt-32 pb-16 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-neutral-100">BATIK</h1>
        <p className="text-xl md:text-2xl text-neutral-400 font-light tracking-wide uppercase mb-10">Peluquería Unisex</p>
        <a href="#turnos" className="bg-neutral-100 text-neutral-900 font-bold py-3 px-8 rounded-full hover:bg-white transition text-lg shadow-lg">AGENDAR TURNO</a>
      </section>

      <section id="turnos" className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          <div className="bg-neutral-950 p-6 border-b border-neutral-700"><h2 className="text-2xl font-bold tracking-widest text-center text-neutral-100 uppercase">Turnos</h2></div>
          
          <div className="flex border-b border-neutral-700 text-sm font-medium">
            <div className={`flex-1 text-center py-4 ${step === 1 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>1. Servicio</div>
            <div className={`flex-1 text-center py-4 border-l border-neutral-700 ${step === 2 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>2. Fecha y Hora</div>
            <div className={`flex-1 text-center py-4 border-l border-neutral-700 ${step === 3 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>3. Datos</div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div className="animate-fade-in space-y-8">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Peluquero:</label>
                  <div className="grid grid-cols-2 gap-4">
                    {stylists.map(s => (
                      <button key={s.name} type="button" onClick={() => setBookingData({...bookingData, stylist: s.name, date: '', time: ''})}
                        className={`flex items-center gap-4 p-4 border rounded-lg transition ${bookingData.stylist === s.name ? 'border-neutral-300 bg-neutral-700 text-white' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300'}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center shrink-0"><span className="text-[10px] text-neutral-500">{s.photoPlaceholder}</span></div>
                        <span className="font-bold text-lg">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Servicio:</label>
                  {loadingConfig ? (
                    <div className="p-4 bg-neutral-900 border border-neutral-700 rounded text-neutral-500 text-center">Cargando servicios...</div>
                  ) : (
                    <select className="w-full p-4 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none" value={bookingData.service} onChange={(e) => setBookingData({...bookingData, service: e.target.value})}>
                      <option value="">Selecciona el servicio</option>
                      {dbServices.map(svc => <option key={svc.id} value={svc.name}>{svc.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-neutral-700">
                  <div className="text-xl font-bold text-neutral-100">{selectedServiceObj ? `$${selectedServiceObj.price.toLocaleString('es-AR')}` : '$0'}</div>
                  <button disabled={!bookingData.service || !bookingData.stylist} onClick={handleNext} className="bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded disabled:opacity-50 hover:bg-white transition">Continuar</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-4">Selecciona una fecha para {bookingData.stylist}:</label>
                    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => { if(currentMonth === 0){setCurrentMonth(11);setCurrentYear(currentYear-1)}else{setCurrentMonth(currentMonth-1)} }} disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()} className="p-1 text-neutral-400 hover:text-white disabled:opacity-30">{'<'}</button>
                        <span className="font-bold text-neutral-100">{monthNames[currentMonth]} {currentYear}</span>
                        <button type="button" onClick={() => { if(currentMonth === 11){setCurrentMonth(0);setCurrentYear(currentYear+1)}else{setCurrentMonth(currentMonth+1)} }} className="p-1 text-neutral-400 hover:text-white">{'>'}</button>
                      </div>
                      <div className="grid grid-cols-7 text-center text-xs font-bold text-neutral-500 mb-2">{daysOfWeek.map(day => <div key={day}>{day}</div>)}</div>
                      <div className="grid grid-cols-7 gap-y-2 text-center">{renderCalendarDays()}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-4">Horarios de {bookingData.stylist}:</label>
                    {!bookingData.date ? (
                      <div className="h-[280px] flex items-center justify-center bg-neutral-900 border border-neutral-700 rounded-lg p-6 text-center text-neutral-500 text-sm">Selecciona una fecha en el calendario.</div>
                    ) : (
                      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 h-[280px]">
                        <div className="grid grid-cols-2 gap-3 h-full overflow-y-auto pr-2 custom-scrollbar content-start">
                          {horariosDisponibles.length === 0 ? <span className="col-span-2 text-center text-neutral-500 mt-4 text-xs font-bold">No hay horarios registrados para este profesional.</span> : null}
                          {horariosDisponibles.map(time => {
                            const isOccupied = occupiedTimes.includes(time);
                            const isSelected = bookingData.time === time;
                            return (
                              <button key={time} disabled={isOccupied} type="button" onClick={() => setBookingData({...bookingData, time: time})}
                                className={`p-3 rounded-lg text-center font-black transition border ${isOccupied ? 'border-neutral-800 bg-neutral-950 text-neutral-700 cursor-not-allowed' : isSelected ? 'bg-neutral-200 text-neutral-900 border-neutral-200' : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-600 text-neutral-200'}`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex justify-between pt-6 border-t border-neutral-700">
                  <button type="button" onClick={handleBack} className="text-neutral-400 hover:text-white transition">← Atrás</button>
                  <button disabled={!bookingData.date || !bookingData.time} onClick={handleNext} className="bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded disabled:opacity-50 hover:bg-white transition">Continuar</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <h3 className="text-xl font-medium text-neutral-200">Tus Datos Personales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900 p-6 rounded-lg border border-neutral-700">
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-neutral-400 mb-2">Nombre Completo *</label><input type="text" required value={bookingData.clientName} onChange={e => setBookingData({...bookingData, clientName: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white font-bold" /></div>
                  <div><label className="block text-xs font-medium text-neutral-400 mb-2">Teléfono de Contacto *</label><input type="tel" required value={bookingData.clientPhone} onChange={e => setBookingData({...bookingData, clientPhone: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white font-bold" /></div>
                  <div><label className="block text-xs font-medium text-neutral-400 mb-2">Correo Electrónico *</label><input type="email" required value={bookingData.clientEmail} onChange={e => setBookingData({...bookingData, clientEmail: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white font-bold" /></div>
                </div>

                <h3 className="text-lg font-medium text-neutral-200 pt-2">Resumen de tu reserva</h3>
                <div className="w-full bg-neutral-900 p-6 rounded-lg border border-neutral-700 space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Servicio:</span> <span className="font-bold text-right">{bookingData.service}</span></div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Profesional:</span> <span className="font-bold text-white bg-neutral-800 px-2 py-1 rounded">{bookingData.stylist}</span></div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Fecha y Hora:</span> <span className="font-bold text-right">{bookingData.date.split('-').reverse().join('/')} a las {bookingData.time} hs</span></div>
                  <div className="flex justify-between items-center pt-2"><span className="text-neutral-400">Total a pagar:</span> <span className="font-black text-lg text-white">${selectedServiceObj?.price.toLocaleString('es-AR')}</span></div>
                </div>
                
                <div className="w-full flex justify-between pt-4 border-t border-neutral-700">
                  <button type="button" onClick={handleBack} className="text-neutral-400 hover:text-white transition font-bold">← Atrás</button>
                  <button disabled={loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail} onClick={handleConfirmBooking} className={`py-3 px-8 rounded font-bold transition ${loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail ? 'bg-neutral-600 text-neutral-400 opacity-50' : 'bg-neutral-200 text-neutral-900 hover:bg-white'}`}>
                    {loading ? 'Procesando...' : 'Confirmar Turno'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="servicios-lista" className="py-20 px-6 max-w-6xl mx-auto border-t border-neutral-800">
        <div className="text-center mb-16"><h2 className="text-4xl font-black tracking-widest text-neutral-100 uppercase">Nuestros Servicios</h2><p className="text-neutral-400 mt-4 text-lg font-bold">Elegí tu estilo en Batik</p></div>
        {loadingConfig ? <div className="text-center text-neutral-500 py-10 font-bold">Cargando catálogo...</div> : dbServices.length === 0 ? <div className="text-center text-neutral-500 py-10 font-bold">Aún no hay servicios disponibles.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dbServices.map(svc => (
              <div key={svc.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col hover:border-neutral-600 transition shadow-lg group">
                {svc.image ? (
                  <div className="h-56 w-full overflow-hidden relative"><img src={svc.image} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent"></div></div>
                ) : (
                  <div className="h-56 w-full bg-neutral-950 flex items-center justify-center border-b border-neutral-800"><span className="text-neutral-600 text-sm uppercase tracking-widest font-black">Batik</span></div>
                )}
                <div className="p-6 flex flex-col flex-1 relative -mt-8">
                  <div className="flex justify-between items-start mb-3 bg-neutral-900 pt-2 rounded-t-lg">
                    <h3 className="text-xl font-black text-neutral-100 pr-4">{svc.name}</h3>
                    <span className="text-xl font-black text-white bg-neutral-800 px-3 py-1 rounded-lg border border-neutral-700">${svc.price.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-neutral-400 text-sm flex-1 mb-8 leading-relaxed font-medium">{svc.description || 'Consulta más detalles en el local.'}</p>
                  <a href="#turnos" onClick={() => { setBookingData({...bookingData, service: svc.name}); setStep(1); }} className="block text-center w-full bg-neutral-800 border border-neutral-700 text-neutral-200 font-black py-3 rounded-lg hover:bg-neutral-200 hover:text-neutral-900 transition mt-auto">Agendar este corte</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer id="contacto" className="bg-neutral-950 pt-16 pb-8 border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black tracking-widest text-neutral-100 mb-6">BATIK</h2>
          <div className="space-y-2 mb-10 text-neutral-400 text-sm font-bold"><p>Gral. Julio A. Roca 1296</p><p>M5539 Las Heras, Mendoza, Argentina</p><p>Martes a Sábados de 10:00 a 18:00 hs</p></div>
          <div className="mb-6"><Link to="/admin" className="inline-block border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 text-xs py-2 px-4 rounded transition bg-neutral-900/30 font-bold">⚙️ Panel Administrativo</Link></div>
          <p className="text-neutral-500 text-xs font-bold">Desarrollado por Lorenzo Cona</p>
        </div>
      </footer>
    </div>
  );
};

export default BatikLanding;
