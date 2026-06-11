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
  
  // ESTADO NUEVO: Guardará los servicios traídos desde Firebase
  const [dbServices, setDbServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [bookingData, setBookingData] = useState({
    service: '',
    stylist: '',
    date: '', 
    time: '',
    clientName: '',
    clientPhone: '',
    clientEmail: ''
  });
  
  const stylists = [
    { name: 'Eze', photoPlaceholder: 'Foto Eze' },
    { name: 'Nico', photoPlaceholder: 'Foto Nico' }
  ];
  
  const availableTimes = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

  // 1. EFECTO PARA TRAER LOS SERVICIOS DE FIREBASE AL CARGAR LA PÁGINA
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "servicios"));
        const servs = [];
        querySnapshot.forEach((doc) => {
          servs.push({ id: doc.id, ...doc.data() });
        });
        setDbServices(servs);
      } catch (error) {
        console.error("Error al cargar los servicios:", error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // 2. EFECTO PARA TRAER HORARIOS OCUPADOS
  useEffect(() => {
    const fetchOccupiedTimes = async () => {
      if (bookingData.date && bookingData.stylist) {
        const turnosRef = collection(db, "turnos");
        const q = query(
          turnosRef, 
          where("date", "==", bookingData.date),
          where("stylist", "==", bookingData.stylist)
        );
        
        const querySnapshot = await getDocs(q);
        const times = [];
        querySnapshot.forEach((doc) => {
          times.push(doc.data().time);
        });
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
        service: bookingData.service,
        stylist: bookingData.stylist,
        date: bookingData.date,
        time: bookingData.time,
        nombre: bookingData.clientName,
        telefono: bookingData.clientPhone,
        correo: bookingData.clientEmail,
        origen: 'Web',
        createdAt: new Date()
      });

      const N8N_WEBHOOK_URL = 'TU_TEST_URL_DE_N8N_AQUI'; 
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: bookingData.service,
          stylist: bookingData.stylist,
          date: bookingData.date,
          time: bookingData.time,
          nombre: bookingData.clientName,
          telefono: bookingData.clientPhone,
          correo: bookingData.clientEmail
        })
      });

      alert('¡Turno confirmado con éxito!');
      setStep(1);
      setBookingData({ 
        service: '', stylist: '', date: '', time: '', 
        clientName: '', clientPhone: '', clientEmail: '' 
      });
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
    } catch (error) {
      console.error("Error en el proceso: ", error);
      alert('Hubo un error al procesar el turno. Intentá de nuevo.');
    }
    setLoading(false);
  };

  // Buscar el objeto del servicio seleccionado (ahora desde dbServices)
  const selectedServiceObj = dbServices.find(s => s.name === bookingData.service);

  // --- LÓGICA DEL CALENDARIO ---
  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);
    
    const maxDate = new Date();
    maxDate.setDate(todayMidnight.getDate() + 14);
    maxDate.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isPast = dateObj < todayMidnight;
      const isBeyondMax = dateObj > maxDate;
      const isClosed = dateObj.getDay() === 0 || dateObj.getDay() === 1; 
      const isSelectable = !isPast && !isBeyondMax && !isClosed;
      
      const isSelected = bookingData.date === dateStr;

      days.push(
        <button
          key={d}
          disabled={!isSelectable}
          type="button"
          onClick={() => setBookingData({...bookingData, date: dateStr, time: ''})}
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition mx-auto ${
            isSelected 
              ? 'bg-neutral-200 text-neutral-900 font-bold shadow-md' 
              : isSelectable 
                ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-600 border border-neutral-700' 
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
      
      {/* NAVBAR */}
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

      {/* HERO SECTION */}
      <section id="home" className="pt-32 pb-16 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-4 text-neutral-100">BATIK</h1>
        <p className="text-xl md:text-2xl text-neutral-400 font-light tracking-wide uppercase mb-10">Peluquería Unisex</p>
        <a href="#turnos" className="bg-neutral-100 text-neutral-900 font-bold py-3 px-8 rounded-full hover:bg-white transition text-lg shadow-lg">
          AGENDAR TURNO
        </a>
      </section>

      {/* SISTEMA DE TURNOS */}
      <section id="turnos" className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          
          <div className="bg-neutral-950 p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-bold tracking-widest text-center text-neutral-100 uppercase">Turnos</h2>
          </div>

          <div className="flex border-b border-neutral-700 text-sm font-medium">
            <div className={`flex-1 text-center py-4 ${step === 1 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>
              1. Servicio
            </div>
            <div className={`flex-1 text-center py-4 border-l border-neutral-700 ${step === 2 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>
              2. Fecha y Hora
            </div>
            <div className={`flex-1 text-center py-4 border-l border-neutral-700 ${step === 3 ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}>
              3. Datos y Confirmación
            </div>
          </div>

          <div className="p-8">
            
            {/* PASO 1: SERVICIO Y PELUQUERO */}
            {step === 1 && (
              <div className="animate-fade-in space-y-8">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Peluquero:</label>
                  <div className="grid grid-cols-2 gap-4">
                    {stylists.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setBookingData({...bookingData, stylist: s.name})}
                        className={`flex items-center gap-4 p-4 border rounded-lg transition ${
                          bookingData.stylist === s.name 
                            ? 'border-neutral-300 bg-neutral-700 text-white' 
                            : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center overflow-hidden shrink-0">
                          <span className="text-[10px] text-neutral-500 text-center leading-tight">{s.photoPlaceholder}</span>
                        </div>
                        <span className="font-bold text-lg">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Servicio:</label>
                  {loadingServices ? (
                    <div className="w-full p-4 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-500 text-center">
                      Cargando servicios disponibles...
                    </div>
                  ) : (
                    <select 
                      className="w-full p-4 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-neutral-500"
                      value={bookingData.service}
                      onChange={(e) => setBookingData({...bookingData, service: e.target.value})}
                    >
                      <option value="">Selecciona el servicio</option>
                      {dbServices.map(svc => (
                        <option key={svc.id} value={svc.name}>{svc.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mt-8 flex justify-between items-center pt-6 border-t border-neutral-700">
                  <div className="text-xl font-bold text-neutral-100">
                    {selectedServiceObj ? `$${selectedServiceObj.price.toLocaleString('es-AR')}` : '$0'}
                  </div>
                  <button 
                    disabled={!bookingData.service || !bookingData.stylist}
                    onClick={handleNext}
                    className="bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: FECHA Y HORA */}
            {step === 2 && (
              <div className="animate-fade-in">
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-4">Selecciona una fecha:</label>
                    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <button 
                          type="button"
                          onClick={handlePrevMonth}
                          disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()}
                          className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="font-bold text-neutral-100">
                          {monthNames[currentMonth]} {currentYear}
                        </span>
                        <button type="button" onClick={handleNextMonth} className="p-1 text-neutral-400 hover:text-white transition">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 text-center text-xs font-bold text-neutral-500 mb-2">
                        {daysOfWeek.map(day => <div key={day}>{day}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-y-2 text-center">
                        {renderCalendarDays()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-4">Horarios disponibles:</label>
                    {!bookingData.date ? (
                      <div className="h-[280px] flex items-center justify-center bg-neutral-900 border border-neutral-700 rounded-lg p-6 text-center text-neutral-500 text-sm">
                        Selecciona una fecha en el calendario para ver los horarios.
                      </div>
                    ) : (
                      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 h-[280px]">
                        <div className="grid grid-cols-2 gap-3 h-full overflow-y-auto pr-2 custom-scrollbar content-start">
                          {availableTimes.map(time => {
                            const isOccupied = occupiedTimes.includes(time);
                            const isSelected = bookingData.time === time;
                            return (
                              <button 
                                key={time}
                                disabled={isOccupied}
                                type="button"
                                onClick={() => setBookingData({...bookingData, time: time})}
                                className={`p-3 rounded-lg text-center font-medium transition border ${
                                  isOccupied 
                                    ? 'border-neutral-800 bg-neutral-950 text-neutral-700 cursor-not-allowed' 
                                    : isSelected
                                      ? 'bg-neutral-200 text-neutral-900 border-neutral-200 shadow-md'
                                      : 'border-neutral-700 bg-neutral-900 hover:bg-neutral-600 text-neutral-200'
                                }`}
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
                  <button 
                    disabled={!bookingData.date || !bookingData.time}
                    onClick={handleNext}
                    className="bg-neutral-200 text-neutral-900 font-bold py-3 px-8 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: DATOS DEL CLIENTE Y CONFIRMACIÓN */}
            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <h3 className="text-xl font-medium text-neutral-200">Tus Datos Personales</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900 p-6 rounded-lg border border-neutral-700">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-400 mb-2">Nombre Completo *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={bookingData.clientName}
                      onChange={(e) => setBookingData({...bookingData, clientName: e.target.value})}
                      className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">Teléfono de Contacto *</label>
                    <input 
                      type="tel"
                      required
                      placeholder="Ej. 2615551234"
                      value={bookingData.clientPhone}
                      onChange={(e) => setBookingData({...bookingData, clientPhone: e.target.value})}
                      className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">Correo Electrónico *</label>
                    <input 
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={bookingData.clientEmail}
                      onChange={(e) => setBookingData({...bookingData, clientEmail: e.target.value})}
                      className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-medium text-neutral-200 pt-2">Resumen de tu reserva</h3>
                <div className="w-full bg-neutral-900 p-6 rounded-lg border border-neutral-700 space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-neutral-400">Servicio:</span> 
                    <span className="font-medium text-right">{bookingData.service}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-neutral-400">Profesional:</span> 
                    <span className="font-medium">{bookingData.stylist}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="text-neutral-400">Fecha y Hora:</span> 
                    <span className="font-medium text-right">
                      {bookingData.date.split('-').reverse().join('/')} a las {bookingData.time} hs
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-400">Total a pagar en el local:</span> 
                    <span className="font-bold text-base text-white">${selectedServiceObj?.price.toLocaleString('es-AR')}</span>
                  </div>
                </div>
                
                <div className="w-full flex justify-between pt-4 border-t border-neutral-700">
                  <button type="button" onClick={handleBack} className="text-neutral-400 hover:text-white transition">← Atrás</button>
                  <button 
                    disabled={loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail}
                    className={`py-3 px-8 rounded font-bold transition ${
                      loading || !bookingData.clientName || !bookingData.clientPhone || !bookingData.clientEmail
                        ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed opacity-50' 
                        : 'bg-neutral-200 text-neutral-900 hover:bg-white'
                    }`}
                    onClick={handleConfirmBooking}
                  >
                    {loading ? 'Procesando...' : 'Confirmar Turno'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* NUEVA SECCIÓN: CATÁLOGO DE SERVICIOS */}
      <section id="servicios-lista" className="py-20 px-6 max-w-6xl mx-auto border-t border-neutral-800">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-widest text-neutral-100 uppercase">Nuestros Servicios</h2>
          <p className="text-neutral-400 mt-4 text-lg">Elegí tu estilo en Batik</p>
        </div>

        {loadingServices ? (
          <div className="text-center text-neutral-500 py-10">Cargando catálogo de servicios...</div>
        ) : dbServices.length === 0 ? (
          <div className="text-center text-neutral-500 py-10">Aún no hay servicios disponibles.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dbServices.map(svc => (
              <div key={svc.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col hover:border-neutral-600 transition shadow-lg group">
                
                {/* Imagen del servicio */}
                {svc.image ? (
                  <div className="h-56 w-full overflow-hidden relative">
                    <img src={svc.image} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent"></div>
                  </div>
                ) : (
                  <div className="h-56 w-full bg-neutral-950 flex items-center justify-center border-b border-neutral-800">
                    <span className="text-neutral-600 text-sm uppercase tracking-widest font-bold">Batik</span>
                  </div>
                )}
                
                {/* Info del servicio */}
                <div className="p-6 flex flex-col flex-1 relative -mt-8">
                  <div className="flex justify-between items-start mb-3 bg-neutral-900 pt-2 rounded-t-lg">
                    <h3 className="text-xl font-bold text-neutral-100 pr-4">{svc.name}</h3>
                    <span className="text-xl font-black text-white bg-neutral-800 px-3 py-1 rounded-lg border border-neutral-700">
                      ${svc.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                  
                  <p className="text-neutral-400 text-sm flex-1 mb-8 leading-relaxed">
                    {svc.description || 'Consulta más detalles de este servicio en nuestro local.'}
                  </p>
                  
                  {/* Botón de agenda que pre-selecciona el servicio y lleva arriba */}
                  <a 
                    href="#turnos" 
                    onClick={() => { 
                      setBookingData({...bookingData, service: svc.name}); 
                      setStep(1); 
                    }} 
                    className="block text-center w-full bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold py-3 rounded-lg hover:bg-neutral-200 hover:text-neutral-900 transition mt-auto"
                  >
                    Agendar este corte
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="bg-neutral-950 pt-16 pb-8 border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black tracking-widest text-neutral-100 mb-6">BATIK</h2>
          
          <div className="space-y-2 mb-10 text-neutral-400 text-sm">
            <p>Gral. Julio A. Roca 1296</p>
            <p>M5539 Las Heras, Mendoza, Argentina</p>
            <p>Martes a Sábados de 10:00 a 18:00 hs</p>
          </div>

          <div className="flex justify-center gap-6 mb-12">
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
            </a>
          </div>

          <div className="mb-6">
            <Link 
              to="/admin" 
              className="inline-block border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 text-xs py-2 px-4 rounded transition bg-neutral-900/30"
            >
              ⚙️ Acceso Panel Administrativo
            </Link>
          </div>

          <p className="text-neutral-500 text-xs">
            Desarrollado por Lorenzo Cona
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BatikLanding;
