import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from './firebase'; 

const defaultTimes = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

const BatikLanding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [occupiedTimes, setOccupiedTimes] = useState([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false); // Estado del menú de la Landing
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  const [dbServices, setDbServices] = useState([]);
  const [horariosConfig, setHorariosConfig] = useState([]); 
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

  useEffect(() => {
    const fetchGlobalConfig = async () => {
      try {
        const servSnap = await getDocs(collection(db, "servicios"));
        setDbServices(servSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const horSnap = await getDocs(collection(db, "horarios"));
        setHorariosConfig(horSnap.docs.map(doc => doc.data()));

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

  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        setStep(1);
        setBookingData({ service: '', stylist: '', date: '', time: '', clientName: '', clientPhone: '', clientEmail: '' });
        window.location.hash = '#home';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

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
      setStep(4);
    } catch (error) {
      alert('Hubo un error al procesar el turno. Intentá de nuevo.');
    }
    setLoading(false);
  };

  const selectedServiceObj = dbServices.find(s => s.name === bookingData.service);

  const getConfigForStylist = () => {
    const config = horariosConfig.filter(h => h.stylist === bookingData.stylist && h.date === bookingData.date);
    const blocked = config.filter(h => h.type === 'blocked').map(h => h.time);
    const added = config.filter(h => h.type === 'added').map(h => h.time);
    const activeTimes = Array.from(new Set([...defaultTimes, ...added]))
      .filter(t => !blocked.includes(t))
      .sort();
    return activeTimes;
  };
  const horariosDisponibles = getConfigForStylist();

  const renderCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={`empty-${i}`} className="h-8 w-8 sm:h-10 sm:w-10"></div>);

    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const maxDate = new Date(); maxDate.setDate(todayMidnight.getDate() + 14); maxDate.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateObj < todayMidnight;
      const isBeyondMax = dateObj > maxDate;
      const isClosed = dateObj.getDay() === 0 || dateObj.getDay() === 1; 
      const isBlocked = blockedDates.some(b => b.date === dateStr && (b.stylist === 'Todos' || b.stylist === bookingData.stylist));
      const isSelectable = !isPast && !isBeyondMax && !isClosed && !isBlocked;
      const isSelected = bookingData.date === dateStr;

      days.push(
        <button
          key={d} disabled={!isSelectable} type="button"
          onClick={() => setBookingData({...bookingData, date: dateStr, time: ''})}
          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm transition mx-auto ${
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
      
      {/* NAVBAR RESPONSIVE */}
      <nav className="fixed top-0 w-full bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-widest">BATIK</div>
          
          {/* Menu Desktop */}
          <div className="hidden md:flex gap-8 text-sm font-medium text-neutral-400">
            <a href="#home" className="hover:text-white transition">Home</a>
            <a href="#turnos" className="hover:text-white transition">Turnos</a>
            <a href="#servicios-lista" className="hover:text-white transition">Servicios</a>
            <a href="#contacto" className="hover:text-white transition">Contacto</a>
          </div>

          {/* Boton Hamburguesa Mobile */}
          <button onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} className="md:hidden text-neutral-400 hover:text-white">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Menu Desplegable Mobile */}
        {isMobileNavOpen && (
          <div className="md:hidden bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex flex-col gap-4 text-sm font-medium">
            <a href="#home" onClick={() => setIsMobileNavOpen(false)} className="block text-neutral-400 hover:text-white py-2">Home</a>
            <a href="#turnos" onClick={() => setIsMobileNavOpen(false)} className="block text-neutral-400 hover:text-white py-2">Turnos</a>
            <a href="#servicios-lista" onClick={() => setIsMobileNavOpen(false)} className="block text-neutral-400 hover:text-white py-2">Servicios</a>
            <a href="#contacto" onClick={() => setIsMobileNavOpen(false)} className="block text-neutral-400 hover:text-white py-2">Contacto</a>
          </div>
        )}
      </nav>

      <section id="home" className="pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter mb-4 text-neutral-100">BATIK</h1>
        <p className="text-lg sm:text-xl md:text-2xl text-neutral-400 font-light tracking-wide uppercase mb-10">Peluquería Unisex</p>
        <a href="#turnos" className="bg-neutral-100 text-neutral-900 font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-full hover:bg-white transition text-base sm:text-lg shadow-lg">AGENDAR TURNO</a>
      </section>

      <section id="turnos" className="py-10 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-neutral-950 p-4 sm:p-6 border-b border-neutral-700">
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-center text-neutral-100 uppercase">Turnos</h2>
          </div>
          
          {step < 4 && (
            <div className="flex flex-col sm:flex-row border-b border-neutral-700 text-xs sm:text-sm font-medium">
              <div className={`flex-1 text-center py-3 sm:py-4 border-b sm:border-b-0 sm:border-r border-neutral-700 ${step === 1 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>1. Servicio</div>
              <div className={`flex-1 text-center py-3 sm:py-4 border-b sm:border-b-0 sm:border-r border-neutral-700 ${step === 2 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>2. Fecha y Hora</div>
              <div className={`flex-1 text-center py-3 sm:py-4 ${step === 3 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>3. Datos</div>
            </div>
          )}

          <div className="p-5 sm:p-8">
            {step === 1 && (
              <div className="animate-fade-in space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-neutral-400 mb-3">Peluquero:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {stylists.map(s => (
                      <button key={s.name} type="button" onClick={() => setBookingData({...bookingData, stylist: s.name, date: '', time: ''})}
                        className={`flex items-center gap-4 p-3 sm:p-4 border rounded-xl transition ${bookingData.stylist === s.name ? 'border-neutral-300 bg-neutral-700 text-white shadow-md' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300'}`}
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center shrink-0"><span className="text-[9px] sm:text-[10px] text-neutral-500">{s.photoPlaceholder}</span></div>
                        <span className="font-bold text-base sm:text-lg">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-neutral-400 mb-3">Servicio:</label>
                  {loadingConfig ? (
                    <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-500 text-center text-sm">Cargando servicios...</div>
                  ) : (
                    <select className="w-full p-3 sm:p-4 bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition text-sm sm:text-base" value={bookingData.service} onChange={(e) => setBookingData({...bookingData, service: e.target.value})}>
                      <option value="">Selecciona el servicio</option>
                      {dbServices.map(svc => <option key={svc.id} value={svc.name}>{svc.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-neutral-700 gap-4">
                  <div className="text-xl sm:text-2xl font-bold text-neutral-100 text-center sm:text-left w-full sm:w-auto">{selectedServiceObj ? `$${selectedServiceObj.price.toLocaleString('es-AR')}` : '$0'}</div>
                  <button disabled={!bookingData.service || !bookingData.stylist} onClick={handleNext} className="w-full sm:w-auto bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded-lg disabled:opacity-50 hover:bg-white transition shadow-md">Continuar</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <div className="grid md:grid-cols-2 gap-6 sm:gap-10">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-neutral-400 mb-3 sm:mb-4">Fecha para {bookingData.stylist}:</label>
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => { if(currentMonth === 0){setCurrentMonth(11);setCurrentYear(currentYear-1)}else{setCurrentMonth(currentMonth-1)} }} disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()} className="p-1 sm:p-2 text-neutral-400 hover:text-white disabled:opacity-30">{'<'}</button>
                        <span className="font-bold text-neutral-100 text-sm sm:text-base">{monthNames[currentMonth]} {currentYear}</span>
                        <button type="button" onClick={() => { if(currentMonth === 11){setCurrentMonth(0);setCurrentYear(currentYear+1)}else{setCurrentMonth(currentMonth+1)} }} className="p-1 sm:p-2 text-neutral-400 hover:text-white">{'>'}</button>
                      </div>
                      <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold text-neutral-500 mb-2">{daysOfWeek.map(day => <div key={day}>{day}</div>)}</div>
                      <div className="grid grid-cols-7 gap-y-2 text-center">{renderCalendarDays()}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-neutral-400 mb-3 sm:mb-4">Horarios disponibles:</label>
                    {!bookingData.date ? (
                      <div className="h-[220px] sm:h-[280px] flex items-center justify-center bg-neutral-900 border border-neutral-700 rounded-xl p-6 text-center text-neutral-500 text-xs sm:text-sm">Selecciona una fecha en el calendario.</div>
                    ) : (
                      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 sm:p-4 h-[220px] sm:h-[280px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 sm:gap-3 h-full overflow-y-auto pr-1 sm:pr-2 custom-scrollbar content-start">
                          {horariosDisponibles.length === 0 ? <span className="col-span-full text-center text-neutral-500 mt-4 text-xs font-bold">Sin horarios disponibles hoy.</span> : null}
                          {horariosDisponibles.map(time => {
                            const isOccupied = occupiedTimes.includes(time);
                            const isSelected = bookingData.time === time;
                            return (
                              <button key={time} disabled={isOccupied} type="button" onClick={() => setBookingData({...bookingData, time: time})}
                                className={`p-2 sm:p-3 rounded-lg text-center font-black transition border text-sm sm:text-base ${isOccupied ? 'border-neutral-800 bg-neutral-950 text-neutral-700 cursor-not-allowed' : isSelected ? 'bg-neutral-200 text-neutral-900 border-neutral-200 shadow-md' : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-600 text-neutral-200'}`}
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

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-between pt-6 border-t border-neutral-700 gap-4">
                  <button type="button" onClick={handleBack} className="text-neutral-400 hover:text-white transition w-full sm:w-auto order-2 sm:order-1 py-2 sm:py-0 font-medium">← Atrás</button>
                  <button disabled={!bookingData.date || !bookingData.time} onClick={handleNext} className="w-full sm:w-auto bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded-lg disabled:opacity-50 hover:bg-white transition shadow-md order-1 sm:order-2">Continuar</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <h3 className="text-lg sm:text-xl font-medium text-neutral-200">Tus Datos Personales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-900 p-4 sm:p-6 rounded-xl border border-neutral-700">
                  <div className="md:col-span-2"><label className="block text-xs font-medium text-neutral-400 mb-2">Nombre Completo *</label><input type="text" required value={bookingData.clientName} onChange={e => setBookingData({...bookingData, clientName: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-bold focus:outline-none focus:border-neutral-500 transition" /></div>
                  <div><label className="block text-xs font-medium text-neutral-400 mb-2">Teléfono de Contacto *</label><input type="tel" required value={bookingData.clientPhone} onChange={e => setBookingData({...bookingData, clientPhone: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-bold focus:outline-none focus:border-neutral-500 transition" /></div>
                  <div><label className="block text-xs font-medium text-neutral-400 mb-2">Correo Electrónico *</label><input type="email" required value={bookingData.clientEmail} onChange={e => setBookingData({...bookingData, clientEmail: e.target.value})} className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-bold focus:outline-none focus:border-neutral-500 transition" /></div>
                </div>

                <h3 className="text-base sm:text-lg font-medium text-neutral-200 pt-2">Resumen de tu reserva</h3>
                <div className="w-full bg-neutral-900 p-4 sm:p-6 rounded-xl border border-neutral-700 space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Servicio:</span> <span className="font-bold text-right text-white">{bookingData.service}</span></div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Profesional:</span> <span className="font-bold text-white bg-neutral-800 px-2 py-1 rounded">{bookingData.stylist}</span></div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2"><span className="text-neutral-400">Fecha y Hora:</span> <span className="font-bold text-right text-white">{bookingData.date.split('-').reverse().join('/')} a las {bookingData.time} hs</span></div>
                  <div className="flex justify-between items-center pt-2"><span className="text-neutral-400">Total a pagar:</span> <span className="font-black text-lg sm:text-xl text-white">${selectedServiceObj?.price.toLocaleString('es-AR')}</span></div>
                </div>
                
                <div className="w-full flex flex-col sm:flex-row justify-between pt-6 border-t border-neutral-700 gap-4">
                  <button type="button" onClick={handleBack} className="text-neutral-400 hover:text-white transition font-medium w-full sm:w-auto order-2 sm:order-1 py-2 sm:py-0">← Atrás</button>
                  <button disabled={loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail} onClick={handleConfirmBooking} className={`w-full sm:w-auto py-3 px-8 rounded-lg font-bold transition order-1 sm:order-2 ${loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail ? 'bg-neutral-600 text-neutral-400 opacity-50' : 'bg-neutral-200 text-neutral-900 hover:bg-white shadow-md'}`}>
                    {loading ? 'Procesando...' : 'Confirmar Turno'}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in flex flex-col items-center text-center py-10 px-2">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">¡Confirmado!</h2>
                <p className="text-neutral-300 mb-8 sm:mb-10 text-base sm:text-lg max-w-sm leading-relaxed">
                  Te esperamos el <strong className="text-white">{bookingData.date.split('-').reverse().join('/')}</strong> a las <strong className="text-white">{bookingData.time} hs</strong> con <strong className="text-white">{bookingData.stylist}</strong>.
                </p>
                <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs sm:text-sm animate-pulse">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Redirigiendo al inicio...
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      <section id="servicios-lista" className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-neutral-800">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-widest text-neutral-100 uppercase">Nuestros Servicios</h2>
          <p className="text-neutral-400 mt-2 sm:mt-4 text-base sm:text-lg font-bold">Elegí tu estilo en Batik</p>
        </div>
        {loadingConfig ? <div className="text-center text-neutral-500 py-10 font-bold">Cargando catálogo...</div> : dbServices.length === 0 ? <div className="text-center text-neutral-500 py-10 font-bold">Aún no hay servicios disponibles.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {dbServices.map(svc => (
              <div key={svc.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col hover:border-neutral-600 transition shadow-lg group">
                {svc.image ? (
                  <div className="h-48 sm:h-56 w-full overflow-hidden relative"><img src={svc.image} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent"></div></div>
                ) : (
                  <div className="h-48 sm:h-56 w-full bg-neutral-950 flex items-center justify-center border-b border-neutral-800"><span className="text-neutral-600 text-sm uppercase tracking-widest font-black">Batik</span></div>
                )}
                <div className="p-5 sm:p-6 flex flex-col flex-1 relative -mt-6 sm:-mt-8">
                  <div className="flex justify-between items-start mb-3 bg-neutral-900 pt-2 rounded-t-lg">
                    <h3 className="text-lg sm:text-xl font-black text-neutral-100 pr-2 sm:pr-4">{svc.name}</h3>
                    <span className="text-base sm:text-xl font-black text-white bg-neutral-800 px-2 sm:px-3 py-1 rounded-lg border border-neutral-700">${svc.price.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm flex-1 mb-6 sm:mb-8 leading-relaxed font-medium">{svc.description || 'Consulta más detalles en el local.'}</p>
                  <a href="#turnos" onClick={() => { setBookingData({...bookingData, service: svc.name}); setStep(1); }} className="block text-center w-full bg-neutral-800 border border-neutral-700 text-neutral-200 font-black py-3 rounded-lg hover:bg-neutral-200 hover:text-neutral-900 transition mt-auto shadow-sm">Agendar este corte</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer id="contacto" className="bg-neutral-950 pt-16 pb-8 border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-neutral-100 mb-6">BATIK</h2>
          <div className="space-y-2 mb-10 text-neutral-400 text-xs sm:text-sm font-bold">
            <p>Gral. Julio A. Roca 1296</p>
            <p>M5539 Las Heras, Mendoza, Argentina</p>
            <p>Martes a Sábados de 10:00 a 18:00 hs</p>
          </div>
          
          {/* Botón Rojo del Admin Ajustado */}
          <div className="mb-8">
            <Link 
              to="/admin" 
              className="inline-block bg-red-600 text-white font-black text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-10 rounded-2xl shadow-lg hover:bg-red-700 transition transform hover:scale-105"
            >
              DASHBOARD
            </Link>
          </div>
          
          <p className="text-neutral-500 text-[10px] sm:text-xs font-bold">Desarrollado por Lorenzo Cona</p>
        </div>
      </footer>
    </div>
  );
};

export default BatikLanding;
