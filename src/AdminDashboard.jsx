import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inicio');
  const [servicios, setServicios] = useState([]);
  const [nuevoServicio, setNuevoServicio] = useState({ name: '', price: '', description: '' });
  
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // --- LÓGICA DE SERVICIOS (FIREBASE + IMGBB) ---
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

  useEffect(() => {
    if (activeTab === 'servicios') {
      fetchServicios();
    }
  }, [activeTab]);

  const handleAddServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.name || !nuevoServicio.price) return;
    
    setIsUploading(true);
    let imageUrl = ''; 

    try {
      // 1. Subir a ImgBB si hay archivo
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        // REEMPLAZÁ EL TEXTO DE ABAJO CON TU API KEY REAL
        const apiKey = 'TU_API_KEY_DE_IMGBB_ACA'; 
        
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData
        });

        const imgbbData = await imgbbRes.json();
        
        if (imgbbData.success) {
          imageUrl = imgbbData.data.url; // ImgBB nos devuelve el link limpio acá
        } else {
          throw new Error('Error al subir la imagen a ImgBB');
        }
      }

      // 2. Guardar en Firebase
      await addDoc(collection(db, "servicios"), {
        name: nuevoServicio.name,
        price: Number(nuevoServicio.price),
        description: nuevoServicio.description,
        image: imageUrl
      });

      setNuevoServicio({ name: '', price: '', description: '' });
      setImageFile(null);
      document.getElementById('imageInput').value = ''; 
      fetchServicios();
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("Hubo un error al subir la foto o guardar el servicio. Intentá de nuevo.");
    }
    setIsUploading(false);
  };

  const handleDeleteServicio = async (id) => {
    if (window.confirm("¿Seguro que querés eliminar este servicio?")) {
      try {
        await deleteDoc(doc(db, "servicios", id));
        fetchServicios();
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

      case 'servicios':
        return (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-neutral-100">Servicios y Precios</h2>

            {/* FORMULARIO CON SUBIDA DE ARCHIVO (IMGBB) */}
            <form onSubmit={handleAddServicio} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Nombre del Servicio *</label>
                  <input 
                    type="text" placeholder="Ej: Corte Clásico"
                    value={nuevoServicio.name} onChange={(e) => setNuevoServicio({...nuevoServicio, name: e.target.value})}
                    className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Precio ($) *</label>
                  <input 
                    type="number" placeholder="Ej: 15000"
                    value={nuevoServicio.price} onChange={(e) => setNuevoServicio({...nuevoServicio, price: e.target.value})}
                    className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500" required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Subir Foto (Desde celu o PC)</label>
                <input 
                  id="imageInput"
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 transition cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Descripción (Opcional)</label>
                <textarea 
                  placeholder="Descripción del servicio..."
                  value={nuevoServicio.description} onChange={(e) => setNuevoServicio({...nuevoServicio, description: e.target.value})}
                  className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-neutral-500 min-h-[80px]"
                />
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className={`w-full py-3 rounded-lg font-bold transition ${isUploading ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-neutral-100 text-neutral-900 hover:bg-white'}`}
              >
                {isUploading ? 'Procesando imagen y guardando...' : '+ Agregar Servicio'}
              </button>
            </form>
            
            {/* LISTA DE SERVICIOS */}
            <div className="grid gap-4 md:grid-cols-2">
              {loadingServicios ? (
                <p className="text-neutral-500 text-center py-4 col-span-full">Cargando servicios...</p>
              ) : servicios.length === 0 ? (
                <p className="text-neutral-500 text-center py-4 col-span-full">No hay servicios cargados.</p>
              ) : (
                servicios.map(svc => (
                  <div key={svc.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex gap-4 items-start">
                    <div className="w-20 h-20 bg-neutral-950 rounded border border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {svc.image ? (
                        <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-600">Sin foto</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-neutral-200 leading-tight">{svc.name}</h3>
                        <p className="text-white font-bold">${svc.price.toLocaleString('es-AR')}</p>
                      </div>
                      {svc.description && (
                        <p className="text-neutral-400 text-sm line-clamp-2 mb-3">{svc.description}</p>
                      )}
                      <button 
                        onClick={() => handleDeleteServicio(svc.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 border border-red-500/20 rounded bg-red-500/10 hover:bg-red-500/20 transition mt-auto"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-neutral-500">
            Sección en construcción
          </div>
        );
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
