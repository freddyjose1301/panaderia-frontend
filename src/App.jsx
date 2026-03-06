import React, { useState, useEffect } from 'react';
import { 
  Package, BarChart3, Plus, Lock, User, 
  TrendingUp, X, ShoppingCart, CheckCircle, Trash2, Search, Minus,
  FileText
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  // --- 1. ESTADOS GLOBALES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [activeTab, setActiveTab] = useState('ventas');
  const [productos, setProductos] = useState([]);
  const [datosCategorias, setDatosCategorias] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [clienteActual, setClienteActual] = useState(null);
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', cedula: '', telefono: '' });
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('V-');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showAdminSubmenu, setShowAdminSubmenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // <--- Control móvil
  const [estaBuscando, setEstaBuscando] = useState(false); // <--- Nuevo estado para el cargando

  const [modoRegistro, setModoRegistro] = useState(false);
  const [mensajeCliente, setMensajeCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [historialVentas, setHistorialVentas] = useState([]); 

  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', categoria: '', precio: '' });
  const [metodoPago, setMetodoPago] = useState('');
  const [referencia, setReferencia] = useState('');
  const [moneda, setMoneda] = useState('');
  const [datosSemanales, setDatosSemanales] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [ventasDelDia, setVentasDelDia] = useState([]);

  const [tasaDolar, setTasaDolar] = useState(60.00); // Tasa manual/inicial
  const [mostrarConfigTasa, setMostrarConfigTasa] = useState(false); // Para ocultar el ajuste

  // Pon esto justo antes del return del componente App
  const totalUSD = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const totalBS = totalUSD * tasaDolar;

  // --- 2. FUNCIONES DE CARGA Y LOGICA ---
  const cargarEstadisticas = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reportes/ventas-semanales`);
      const data = await res.json();
      setDatosSemanales(data);
    } catch (error) { console.error("Error en estadísticas"); }
  };

  const buscarPorFecha = async (fecha) => {
    setFechaFiltro(fecha);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reportes/ventas-dia?fecha=${fecha}`);
      const data = await res.json();
      setVentasDelDia(Array.isArray(data) ? data : []);
    } catch (error) { 
      console.error("Error buscando por fecha");
      setVentasDelDia([]);
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/productos`);
      const data = await res.json();
      setProductos(data);
    } catch (error) { console.error("Error: Backend no disponible"); }
  };

  const manejarAccesoAdmin = () => {
    if (isAdminUnlocked) {
      setShowAdminSubmenu(!showAdminSubmenu);
    } else {
      const clave = window.prompt("Ingrese la clave de administrador:");
      if (clave === 'chile1234') {
        setIsAdminUnlocked(true);
        setShowAdminSubmenu(true);
      } else if (clave !== null) alert("Clave incorrecta");
    }
  };

  const cargarClientes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/clientes`);
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) { setClientes([]); }
  };

  const verHistorial = async (cliente) => {
    setClienteSeleccionado(cliente);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ventas/cliente/${cliente.id}`);
      const data = await res.json();
      setHistorialVentas(Array.isArray(data) ? data : []);
    } catch (error) { setHistorialVentas([]); }
  };

  const buscarCliente = async (e) => {
    e.preventDefault();
    setEstaBuscando(true); // Inicia el efecto de carga
    const cedulaCompleta = `${tipoDocumento}${datosNuevoCliente.cedula}`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/clientes/cedula/${cedulaCompleta}`);
      if (res.ok) {
        const data = await res.json();
        setClienteActual(data);
        setMensajeCliente('');
      } else {
        setModoRegistro(true);
        setMensajeCliente('Cliente no registrado.');
      }
    } catch (error) { 
      console.error("Error de red"); 
      alert("Error de conexión. El servidor está despertando..."); //
    } finally {
      setEstaBuscando(false); // Finaliza el efecto de carga siempre, falle o gane
    }
  };

  const registrarCliente = async (e) => {
    e.preventDefault();
    const cedulaCompleta = `${tipoDocumento}${datosNuevoCliente.cedula}`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datosNuevoCliente, cedula: cedulaCompleta })
      });
      if (res.ok) {
        const data = await res.json();
        setClienteActual(data);
        cargarClientes();
      }
    } catch (error) { alert("Error al registrar"); }
  };

  const cargarReporteCategorias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reportes/categorias`);
      const data = await res.json();
      const formateados = data.map((item, idx) => ({
        name: item.categoria,
        value: item.cantidad,
        color: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'][idx % 4]
      }));
      setDatosCategorias(formateados);
    } catch (error) { console.error("Error reportes"); }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoProducto, precio: parseFloat(nuevoProducto.precio) })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNuevoProducto({ nombre: '', categoria: '', precio: '' });
        cargarProductos();
      }
    } catch (error) { alert("Error al guardar"); }
  };

  const resetearVenta = () => {
    setClienteActual(null);
    setCarrito([]);
    setDatosNuevoCliente({ nombre: '', cedula: '', telefono: '' });
    setModoRegistro(false);
    setMetodoPago(''); setReferencia(''); setMoneda('');
  };

  const finalizarVenta = async () => {
    try {
      const totalVenta = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
      const registroVenta = {
        total: totalVenta,
        cliente: { id: clienteActual.id },
        metodoPago, referencia, moneda,
        detalles: carrito.map(item => ({
          producto: { id: item.id },
          cantidad: item.cantidad,
          precioUnitario: item.precio
        }))
      };
      const resVenta = await fetch(`${API_BASE_URL}/api/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registroVenta)
      });
      if (!resVenta.ok) throw new Error();
      if (window.confirm(`¡Venta Exitosa!\n¿Imprimir factura?`)) window.print();
      resetearVenta(); cargarProductos();
    } catch (error) { alert("Error al registrar venta"); }
  };

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    else setCarrito([...carrito, { ...p, cantidad: 1 }]);
  };

  const restarDelCarrito = (id) => {
    const existe = carrito.find(item => item.id === id);
    if (existe.cantidad === 1) setCarrito(carrito.filter(item => item.id !== id));
    else setCarrito(carrito.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item));
  };

  const quitarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id !== id));

  const generarPDFSemanal = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reportes/detalle-semanal`);
        const ventas = await res.json();
        
        const doc = new jsPDF();
        
        // 1. Título y Encabezado (Igual a tu referencia)
        doc.setFontSize(22);
        doc.setTextColor(249, 115, 22); // Color Naranja Streel
        doc.setFont("helvetica", "bold");
        doc.text("PANADERÍA STREEL", 105, 20, { align: "center" }); // [cite: 1]
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Reporte de Ventas Semanales - Auditoría", 105, 28, { align: "center" }); // [cite: 2]

        // 2. Cálculo del Total General
        const totalGeneral = ventas.reduce((acc, v) => acc + (v.total || 0), 0); // 

        // 3. Mapeo de datos (Reordenado según tu PDF de ejemplo)
        const tablaData = ventas.map((v) => [
          new Date(v.fecha).toLocaleDateString(), // Fecha
          v.detalles.map(d => `${d.producto?.nombre} (x${d.cantidad})`).join(", "), // Productos 
          v.cliente?.nombre || "General", // Cliente
          v.metodoPago || "Efectivo", // Pago
          `$${(v.total || 0).toFixed(2)}` // Monto
        ]);

        // 4. Generación de la Tabla
        autoTable(doc, { 
          startY: 40, 
          head: [['Fecha', 'Productos', 'Cliente', 'Pago', 'Monto']], // 
          body: tablaData, 
          headStyles: { fillColor: [249, 115, 22] },
          theme: 'striped'
        });

        // 5. Añadir el TOTAL al final de la tabla
        const finalY = doc.lastAutoTable.finalY; // Obtiene la posición donde terminó la tabla
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL SEMANA: $${totalGeneral.toFixed(2)}`, 195, finalY + 15, { align: "right" }); // 

        doc.save(`Reporte_Semanal_Streel_${new Date().toLocaleDateString()}.pdf`);
      } catch (error) { 
        console.error(error);
        alert("Error al generar PDF"); 
      }
    };

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === 'ventas' || activeTab === 'inventario') cargarProductos();
      if (activeTab === 'reportes') {
        cargarReporteCategorias(); cargarClientes(); cargarEstadisticas();
        buscarPorFecha(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isLoggedIn, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.user === 'admin' && credentials.pass === 'streel2026') setIsLoggedIn(true);
    else alert("Acceso denegado");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 lg:p-12 rounded-[40px] shadow-2xl w-full max-w-md border border-orange-100 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-10"><h2 className="text-4xl lg:text-5xl font-black text-orange-600 italic tracking-tighter">Panadería Streel</h2></div>
          <div className="space-y-4">
            <div className="relative"><User className="absolute left-4 top-4 text-gray-300" size={20} /><input required type="text" placeholder="Usuario" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-medium text-sm" onChange={(e) => setCredentials({...credentials, user: e.target.value})} /></div>
            <div className="relative"><Lock className="absolute left-4 top-4 text-gray-300" size={20} /><input required type="password" placeholder="Contraseña" className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-medium text-sm" onChange={(e) => setCredentials({...credentials, pass: e.target.value})} /></div>
            <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 shadow-xl transition-all active:scale-95">ACCEDER</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print { #app-container { display: none !important; } #ticket-impresion { display: block !important; visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; color: black; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 10px; }
      `}</style>
    
      <div id="app-container" className="flex flex-col lg:flex-row h-screen bg-orange-50/30 font-sans overflow-hidden print:hidden">
        
        {/* --- HEADER MÓVIL --- */}
        <div className="lg:hidden bg-white border-b border-orange-100 p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-xl font-black text-orange-600 italic">Panadería Streel</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-orange-500">
            {isMobileMenuOpen ? <X size={28} /> : <BarChart3 size={28} className="rotate-90" />}
          </button>
        </div>

        {/* --- SIDEBAR --- */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-orange-100 p-8 flex flex-col shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <h1 className="text-3xl font-black text-orange-600 italic mb-12 hidden lg:block">Panadería Streel</h1>
          <nav className="flex-1 space-y-3">
            <button onClick={() => { setActiveTab('ventas'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${activeTab==='ventas'?'bg-orange-500 text-white shadow-lg shadow-orange-200':'text-gray-400 hover:bg-orange-50'}`}><ShoppingCart size={22}/> Ventas</button>
            <div className="space-y-2">
              <button onClick={manejarAccesoAdmin} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${showAdminSubmenu ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-orange-50'}`}><div className="flex items-center gap-4"><Lock size={22} /> Administrador</div><Plus size={18} className={showAdminSubmenu ? 'rotate-45' : ''} /></button>
              {isAdminUnlocked && showAdminSubmenu && (
                <div className="pl-6 space-y-2 animate-in slide-in-from-top-2">
                  <button onClick={() => { setActiveTab('inventario'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl font-bold text-sm ${activeTab==='inventario'?'text-orange-600 bg-orange-50':'text-gray-400'}`}><Package size={18}/> Inventario</button>
                  <button onClick={() => { setActiveTab('reportes'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl font-bold text-sm ${activeTab==='reportes'?'text-orange-600 bg-orange-50':'text-gray-400'}`}><BarChart3 size={18}/> Reportes</button>
                </div>
              )}
            </div>

            {/* Panel de Tasa Rápida */}
            <div className="bg-white p-4 rounded-2xl border border-orange-100 mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Tasa del Día</p>
                  <p className="font-bold text-gray-800">1 USD = {tasaDolar.toFixed(2)} Bs</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const nuevaTasa = window.prompt("Nueva tasa en Bs:", tasaDolar);
                  if (nuevaTasa) setTasaDolar(parseFloat(nuevaTasa));
                }}
                className="bg-gray-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-50 transition-colors"
              >
                CAMBIAR TASA
              </button>
            </div>
          </nav>
          <button onClick={() => setIsLoggedIn(false)} className="text-red-400 font-bold p-4 hover:bg-red-50 rounded-2xl transition-all">Cerrar Sesión</button>
        </aside>

        {isMobileMenuOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

        <main className="flex-1 p-4 lg:p-10 overflow-y-auto w-full">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div><h2 className="text-2xl lg:text-3xl font-extrabold text-gray-800 capitalize tracking-tight">{activeTab}</h2><p className="text-gray-400 font-medium text-xs lg:text-sm">Operaciones activas en tiempo real</p></div>
            {activeTab === 'inventario' && (<button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg"><Plus size={24} /> Nuevo Producto</button>)}
          </header>

          {activeTab === 'ventas' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 h-full max-w-5xl mx-auto pb-8">
              {!clienteActual ? (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-100 text-center max-w-lg mx-auto mt-10">
                  <div className="bg-orange-100 p-4 rounded-2xl mb-4 inline-block"><User className="text-orange-500" size={32} /></div>
                  <h3 className="text-2xl font-black text-gray-800 italic mb-6">Identificar Cliente</h3>
                  <form onSubmit={modoRegistro ? registrarCliente : buscarCliente} className="space-y-4">
                    <div className="flex gap-2">
                      <select className="bg-gray-100 border-none rounded-2xl px-3 font-bold text-orange-600 text-sm" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}><option value="V-">V-</option><option value="E-">E-</option><option value="P-">P-</option></select>
                      <input required type="text" placeholder="Cédula" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" value={datosNuevoCliente.cedula} onChange={e => { setDatosNuevoCliente({ ...datosNuevoCliente, cedula: e.target.value.replace(/\D/g, '') }); setModoRegistro(false); }} />
                    </div>
                    {modoRegistro && (<div className="space-y-4 animate-in zoom-in"><input required type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} /><input type="text" placeholder="Teléfono" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm" value={datosNuevoCliente.telefono} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, telefono: e.target.value})} /></div>)}
                      <button 
                        type="submit" 
                        disabled={estaBuscando} // Desactiva el botón mientras busca
                        className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${estaBuscando ? 'bg-orange-400 cursor-wait' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                      >
                        {estaBuscando ? (
                          <>
                            <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            BUSCANDO CLIENTE...
                          </>
                        ) : (
                          modoRegistro ? 'REGISTRAR Y VENDER' : 'BUSCAR CLIENTE'
                        )}
                      </button>
                    </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3"><div className="bg-orange-500 p-2 rounded-xl text-white shadow-md"><User size={20} /></div><div><p className="text-[9px] font-black text-orange-500 uppercase leading-none">Venta para:</p><h4 className="text-lg font-bold text-gray-800 mt-1">{clienteActual.nombre}</h4></div></div>
                    <button onClick={resetearVenta} className="text-gray-300 hover:text-red-500 font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors"><Trash2 size={14} /> CANCELAR</button>
                  </div>
                  <div className="relative group"><div className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400"><Search size={20} strokeWidth={3} /></div><input type="text" placeholder="Buscar pan..." className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl shadow-lg border-none text-base font-bold focus:ring-2 focus:ring-orange-500" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    {busqueda.length > 0 && (<div className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-orange-100 z-50 max-h-60 overflow-y-auto p-3 space-y-1.5 animate-in fade-in zoom-in">{productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (<button key={p.id} onClick={() => { agregarAlCarrito(p); setBusqueda(''); }} className="w-full flex justify-between items-center p-3 hover:bg-orange-50 rounded-xl transition-colors text-left"><div className="flex flex-col"><span className="font-bold text-gray-800 text-sm">{p.nombre}</span></div><span className="bg-orange-600 text-white px-3 py-1.5 rounded-lg font-black text-xs">${p.precio.toFixed(2)} +</span></button>))}</div>)}
                  </div>
                  <div className="bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30"><h3 className="text-lg font-black text-gray-800 italic flex items-center gap-2"><ShoppingCart size={22} className="text-orange-600" /> Resumen</h3><span className="text-gray-400 font-bold text-xs">{carrito.length} artículos</span></div>
                    <div className="p-4 max-h-[350px] overflow-y-auto custom-scrollbar bg-gray-50/20">
                      <div className="hidden lg:grid grid-cols-12 px-6 mb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest"><div className="col-span-5">Descripción</div><div className="col-span-2 text-center">Cant.</div><div className="col-span-2 text-right">Unit.</div><div className="col-span-2 text-right">Total</div><div className="col-span-1"></div></div>
                      <div className="space-y-2">
                        {carrito.map(item => (
                          <div key={item.id} className="grid grid-cols-12 items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right-4 gap-2 lg:gap-0">
                            <div className="col-span-12 lg:col-span-5 px-3 font-bold text-gray-700 text-sm">{item.nombre}</div>
                            <div className="col-span-4 lg:col-span-2 flex justify-center"><div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100 shadow-inner"><button onClick={() => restarDelCarrito(item.id)} className="p-1 text-gray-400 hover:text-orange-600"><Minus size={14} /></button><span className="font-black text-base w-6 text-center">{item.cantidad}</span><button onClick={() => agregarAlCarrito(item)} className="p-1 text-gray-400 hover:text-orange-600"><Plus size={14} /></button></div></div>
                            <div className="col-span-4 lg:col-span-2 text-right font-bold text-gray-400 text-xs lg:text-sm">${item.precio.toFixed(2)}</div>
                            <div className="col-span-3 lg:col-span-2 text-right font-black text-orange-600 text-sm lg:text-base">${(item.precio * item.cantidad).toFixed(2)}</div>
                            <div className="col-span-1 text-center"><button onClick={() => quitarDelCarrito(item.id)} className="text-gray-300 hover:text-red-500"><X size={18} /></button></div>
                          </div>
                        ))}
                        {carrito.length === 0 && (<div className="text-center py-20 opacity-20"><ShoppingCart size={60} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">Usa la barra de búsqueda</p></div>)}
                      </div>
                    </div>
                    <div className="p-6 bg-white border-t-2 border-dashed border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-[9px] font-black text-orange-600 uppercase ml-1">Método</label><select className="w-full p-3 bg-white rounded-xl border-none shadow-sm font-bold text-xs" value={metodoPago} onChange={(e) => { setMetodoPago(e.target.value); setReferencia(''); setMoneda(''); }}><option value="">Pago...</option><option value="Tarjeta de Débito">Tarjeta</option><option value="Pago Móvil">Pago Móvil</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option></select></div>
                        {metodoPago && metodoPago !== 'Efectivo' && (<div className="space-y-1 animate-in zoom-in"><label className="text-[9px] font-black text-orange-600 uppercase ml-1">Ref. (4 Díg)</label><input type="text" maxLength="4" placeholder="0000" className="w-full p-3 bg-white rounded-xl border-none shadow-sm font-bold text-xs" value={referencia} onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))} /></div>)}
                        {metodoPago === 'Efectivo' && (<div className="space-y-1 animate-in zoom-in"><label className="text-[9px] font-black text-orange-600 uppercase ml-1">Moneda</label><div className="flex gap-1.5">{['Bs', '$', '€'].map(m => (<button key={m} onClick={() => setMoneda(m)} className={`flex-1 py-2 rounded-lg font-black text-[10px] ${moneda === m ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-400'}`}>{m}</button>))}</div></div>)}
                      </div>
                      <div className="flex flex-col items-end w-full">
                        <div className="mb-4 text-right w-full border-b border-orange-100 pb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 font-black uppercase text-[10px] tracking-[2px]">Monto en Bs (Tasa: {tasaDolar.toFixed(2)})</span>
                            <span className="text-2xl font-black text-orange-600">Bs {totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-black uppercase text-[10px] tracking-[4px]">Monto Neto USD</span>
                            <span className="text-4xl font-black text-gray-900 tracking-tighter">${totalUSD.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={finalizarVenta} 
                          disabled={carrito.length === 0 || !metodoPago || (metodoPago === 'Efectivo' && !moneda) || (metodoPago !== 'Efectivo' && referencia.length < 4)} 
                          className="w-full lg:w-auto px-10 bg-orange-600 text-white py-4 rounded-2xl font-black text-base hover:bg-orange-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                          <CheckCircle size={20}/> CONFIRMAR VENTA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventario' && (
            <div className="bg-white rounded-[40px] shadow-sm border border-orange-100 p-6 lg:p-10 animate-in fade-in overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead><tr className="text-gray-400 text-[10px] lg:text-xs uppercase font-bold tracking-[2px] border-b border-orange-50"><th className="pb-8">Nombre</th><th className="pb-8">Categoría</th><th className="pb-8">Precio</th></tr></thead><tbody className="divide-y divide-orange-50">{productos.map(p => (<tr key={p.id} className="hover:bg-orange-50/40 transition-colors"><td className="py-6 font-bold text-gray-700 text-sm lg:text-base">{p.nombre}</td><td className="py-6"><span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">{p.categoria}</span></td><td className="py-6 text-gray-500 font-bold text-sm lg:text-base">${p.precio.toFixed(2)}</td></tr>))}</tbody></table></div>
            </div>
          )}

          {activeTab === 'reportes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4"><h2 className="text-2xl font-black text-gray-800">Análisis de Negocio</h2><button onClick={generarPDFSemanal} className="w-full sm:w-auto bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95"><FileText size={20} /> Exportar Semana a PDF</button></div>
              <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[50px] shadow-sm border border-orange-100">
                <div className="flex flex-col lg:flex-row items-center justify-between mb-10 gap-4"><div><h3 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-3"><TrendingUp size={28} className="text-green-500"/> Categorías</h3><p className="text-xs lg:text-sm text-gray-400 mt-1">Análisis en tiempo real</p></div></div>
                <div className="h-[300px] lg:h-[350px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={datosCategorias.length > 0 ? datosCategorias : [{name: 'Sin datos', value: 1, color: '#f3f4f6'}]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{datosCategorias.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}</Pie><Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" /></PieChart></ResponsiveContainer></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 lg:p-8 rounded-[40px] shadow-sm border border-orange-100"><h3 className="text-lg lg:text-xl font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-green-500" /> Rendimiento Semanal ($)</h3><div className="h-[250px] lg:h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={datosSemanales}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="fecha" tick={{fontSize: 9}} tickFormatter={(str) => str.split('-').slice(1).reverse().join('/')} /><YAxis tick={{fontSize: 9}} /><Tooltip cursor={{fill: '#fff7ed'}} contentStyle={{borderRadius: '15px', border: 'none'}} /><Bar dataKey="total" fill="#f97316" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 lg:p-8 rounded-[40px] shadow-sm border border-orange-100 flex flex-col"><h3 className="text-lg lg:text-xl font-bold mb-6">Auditoría por Fecha</h3><input type="date" className="w-full p-4 bg-orange-50 rounded-2xl border-none font-bold text-orange-800 mb-6 text-sm" value={fechaFiltro} onChange={(e) => buscarPorFecha(e.target.value)} /><div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-2 custom-scrollbar">{ventasDelDia.length > 0 ? ventasDelDia.map(v => (<div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><div><p className="text-xs font-bold text-gray-700">{v.cliente?.nombre || 'General'}</p><p className="text-[9px] text-gray-400">{new Date(v.fecha).toLocaleTimeString()}</p></div><span className="font-black text-orange-600 text-sm">${v.total.toFixed(2)}</span></div>)) : (<div className="text-center py-10 opacity-20"><Search size={40} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Sin registros</p></div>)}</div></div>
              </div>
              <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[50px] shadow-sm border border-orange-100"><h3 className="text-xl lg:text-2xl font-bold mb-8">Clientes Registrados</h3><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr className="text-gray-400 text-[10px] uppercase font-black border-b border-orange-50"><th className="pb-6">Nombre</th><th className="pb-6">Cédula</th><th className="pb-6">Teléfono</th><th className="pb-6 text-right">Acción</th></tr></thead><tbody className="divide-y divide-orange-50">{clientes.map(c => (<tr key={c.id} onClick={() => verHistorial(c)} className="hover:bg-orange-50 cursor-pointer transition-colors group"><td className="py-5 font-bold text-gray-700 text-sm lg:text-base">{c.nombre}</td><td className="py-5 text-gray-500 text-sm lg:text-base">{c.cedula}</td><td className="py-5 text-gray-400 font-medium text-xs lg:text-sm">{c.telefono || <span className="text-gray-200 italic">N/R</span>}</td><td className="py-5 text-right"><span className="text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-xs">Ver Compras →</span></td></tr>))}</tbody></table></div></div>
              {clienteSeleccionado && (<div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-end z-[60]"><div className="bg-white w-full max-w-sm h-full shadow-2xl p-6 lg:p-10 overflow-y-auto animate-in slide-in-from-right duration-300"><button onClick={() => setClienteSeleccionado(null)} className="mb-8 text-gray-400 hover:text-black flex items-center gap-2"><X size={24} /> Cerrar</button><h2 className="text-2xl font-black text-gray-800 mb-2">{clienteSeleccionado.nombre}</h2><p className="text-xs text-gray-400 mb-10">Historial completo</p><div className="space-y-6">{historialVentas.length > 0 ? historialVentas.map(v => (<div key={v.id} className="border-l-4 border-orange-500 bg-orange-50/30 p-4 lg:p-6 rounded-r-3xl relative"><div className="flex justify-between items-start mb-4"><div><p className="text-[9px] font-black text-orange-600 uppercase">Fecha</p><p className="font-bold text-gray-700 text-xs">{new Date(v.fecha).toLocaleString()}</p></div><div className="text-right"><p className="text-xl font-black text-gray-900">${v.total.toFixed(2)}</p><span className="text-[8px] bg-white px-2 py-0.5 rounded-full border border-orange-200 text-orange-500 font-bold uppercase">{v.metodoPago}</span></div></div><div className="bg-white/50 rounded-2xl p-4 space-y-2 mb-4"><p className="text-[9px] font-black text-gray-400 uppercase">Artículos:</p>{v.detalles && v.detalles.map(d => (<div key={d.id} className="flex justify-between text-[10px] font-bold text-gray-600"><span>• {d.producto?.nombre} (x{d.cantidad})</span><span>${(d.precioUnitario * d.cantidad).toFixed(2)}</span></div>))}</div>{v.referencia && (<p className="text-[9px] text-gray-400 font-bold">Ref: <span className="text-gray-700">#{v.referencia}</span></p>)}<p className="text-[8px] text-gray-300 mt-2 italic">ID: #STREEL-00{v.id}</p></div>)) : (<p className="text-center text-gray-300 py-20 italic">No hay registros.</p>)}</div></div></div>)}
            </div>
          )}
        </main>
      </div>

      {/* --- EL TICKET IMPRIMIBLE --- */}
      <div className="hidden print:block font-mono text-black p-8 max-w-sm mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black">PANADERÍA STREEL</h2>
          <p className="text-sm">Guanare, Venezuela</p>
          <p className="text-sm mt-2">===============================</p>
        </div>

        <div className="mb-6 text-sm">
          <p><strong>FECHA:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          <p><strong>CLIENTE:</strong> {clienteActual?.nombre}</p>
          <p><strong>C.I / RIF:</strong> {clienteActual?.cedula}</p>
        </div>

        <table className="w-full text-left text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-b border-t border-black border-dashed">
              <th className="py-2">CANT</th>
              <th className="py-2">DESCRIPCIÓN</th>
              <th className="py-2 text-right">TOTAL</th>
            </tr>
          </thead>

          <tbody>
            {carrito.map(item => (
              <tr key={item.id} className="border-b border-black border-dashed">
                <td className="py-2">{item.cantidad}</td>
                <td className="py-2">{item.nombre}</td>
                <td className="py-2 text-right">${(item.precio * item.cantidad).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right mb-8">
          <p className="text-sm">Subtotal: ${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toFixed(2)}</p>
          <p className="text-xl font-black mt-2">TOTAL PAGO: ${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toFixed(2)}</p>
        </div>

        <div className="text-center text-sm">
          <p>===============================</p>
          <p className="mt-2 font-bold uppercase">¡Gracias por su compra!</p>
          <p className="mt-1 italic">Sistema POS creado por Freddy V.</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xl flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-[40px] p-8 lg:p-12 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-8 top-8 text-gray-300 hover:text-gray-600"><X size={28} /></button>
            <h3 className="text-2xl lg:text-3xl font-black text-gray-800 mb-10 text-center italic">Registrar Pan</h3>
            <form onSubmit={guardarProducto} className="space-y-6">
              <input required type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold text-sm" value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} />
              <input required type="number" step="0.01" placeholder="Precio ($)" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold text-sm" value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold text-gray-400 text-sm" value={nuevoProducto.categoria} onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}><option value="">Categoría...</option><option value="Salados">Salados</option><option value="Dulces">Dulces</option><option value="Temporada">Temporada</option></select>
              <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 shadow-xl mt-6">Confirmar</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;