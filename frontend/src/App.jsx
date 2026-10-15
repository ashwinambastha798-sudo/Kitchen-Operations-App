import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { 
  Activity, Target, Flame, ChevronRight, Zap, CloudRain, Sun, Droplets, MapPin, 
  CheckCircle, Utensils, Clock, AlertTriangle, Trash2, DollarSign, TrendingDown, 
  Leaf, Users, ShoppingCart, Receipt, Play, Pause, AlertOctagon, Printer 
} from 'lucide-react';

const API_URL = "http://localhost:8000/api";

const CITIES = [
  { name: 'Mumbai, IN', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi, IN', lat: 28.6139, lon: 77.2090 },
  { name: 'New York, US', lat: 40.7128, lon: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 }
];

const MENU_ITEMS = [
  { name: 'Chicken Parmesan', ingredients: [{name: 'Chicken', qty: 0.25}, {name: 'Cheese', qty: 0.1}, {name: 'Tomatoes', qty: 0.2}], basePrice: 850 },
  { name: 'Seafood Pasta', ingredients: [{name: 'Pasta', qty: 0.2}, {name: 'Fish', qty: 0.2}, {name: 'Tomatoes', qty: 0.1}], basePrice: 950 },
  { name: 'Mutton Stew', ingredients: [{name: 'Mutton', qty: 0.3}, {name: 'Tomatoes', qty: 0.1}, {name: 'Bread', qty: 0.1}], basePrice: 1100 },
  { name: 'Classic Omelette', ingredients: [{name: 'Eggs', qty: 0.1}, {name: 'Cheese', qty: 0.05}, {name: 'Milk', qty: 0.05}], basePrice: 280 },
  { name: 'Margherita Pizza', ingredients: [{name: 'Flour', qty: 0.3}, {name: 'Cheese', qty: 0.2}, {name: 'Tomatoes', qty: 0.15}], basePrice: 650 }
];

export default function App() {
  const [parLevels, setParLevels] = useState({
    'Chicken': 15, 'Cheese': 5, 'Tomatoes': 10, 'Pasta': 20, 'Fish': 10, 'Mutton': 15, 'Bread': 5, 'Eggs': 5, 'Milk': 2, 'Flour': 15
  });
  const [ingredientCosts, setIngredientCosts] = useState({
    'Chicken': 8, 'Cheese': 15, 'Tomatoes': 3, 'Pasta': 1.2, 'Fish': 12, 'Mutton': 14, 'Bread': 2, 'Eggs': 5, 'Milk': 1.5, 'Flour': 0.8
  });
  const [ingredientUnits, setIngredientUnits] = useState({
    'Chicken': 'kg', 'Cheese': 'kg', 'Tomatoes': 'kg', 'Pasta': 'kg', 'Fish': 'kg', 'Mutton': 'kg', 'Bread': 'kg', 'Eggs': 'crates', 'Milk': 'liters', 'Flour': 'kg'
  });
  const [itemExpiryDays, setItemExpiryDays] = useState({
    'Chicken': 10, 'Cheese': 30, 'Tomatoes': 14, 'Pasta': 365, 'Fish': 5, 'Mutton': 7, 'Bread': 7, 'Eggs': 21, 'Milk': 10, 'Flour': 365
  });

  const PAR_LEVELS = parLevels;
  const INGREDIENT_COSTS = ingredientCosts;
  const INGREDIENT_UNITS = ingredientUnits;

  const [newItemDef, setNewItemDef] = useState({ name: '', expiryDays: '', type: 'Vegetable' });

  const addNewItemDefinition = () => {
    if (!newItemDef.name || !newItemDef.expiryDays || !newItemDef.type) return alert("Fill all fields for new item");
    
    setIngredientUnits(prev => ({ ...prev, [newItemDef.name]: 'kg' }));
    setIngredientCosts(prev => ({ ...prev, [newItemDef.name]: 5 }));
    setParLevels(prev => ({ ...prev, [newItemDef.name]: 10 }));
    setItemExpiryDays(prev => ({ ...prev, [newItemDef.name]: parseInt(newItemDef.expiryDays) }));
    
    alert(`Item ₹{newItemDef.name} added successfully! You can now use it in batches.`);
    setNewItemDef({ name: '', expiryDays: '', type: 'Vegetable' });
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: tomorrowStr,
    latitude: CITIES[0].lat,
    longitude: CITIES[0].lon,
    special_event_type: 'Regular',
    previous_headcount: 150
  });
  
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locName, setLocName] = useState('Getting Location...');

  const getRelativeDate = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  // INVENTORY BATCHES
  const [batches, setBatches] = useState([]);
  
  const [userId, setUserId] = useState(localStorage.getItem('bavarchi_user') || '');
  const [loginInput, setLoginInput] = useState('');
  
  const handleLogin = (e) => {
    e.preventDefault();
    if(loginInput.trim()) {
      localStorage.setItem('bavarchi_user', loginInput.trim());
      setUserId(loginInput.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bavarchi_user');
    setUserId('');
    setBatches([]);
  };

  const fetchBatches = async () => {
    if(!userId) return;
    try {
      const res = await axios.get(`${API_URL}/inventory/batches`, { headers: { 'x-user-id': userId }});
      setBatches(res.data);
    } catch(e) { console.error(e); }
  };
  
  useEffect(() => {
    fetchBatches();
  }, [userId]);


  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchOrderDate, setBatchOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchItems, setBatchItems] = useState([{ name: 'Chicken', quantity: '', expiryDate: '' }]);

  const [alerts, setAlerts] = useState([]);

  // PO MODAL
  const [showPO, setShowPO] = useState(false);

  // TOOLTIPS
  const [activeTooltip, setActiveTooltip] = useState(null);

  const TOOLTIP_TEXTS = {
    'Expired': 'This item has passed its shelf life and must be discarded immediately for health safety.',
    'Critical': 'Expires in 2 days or less. Discard soon. Will not be sold in special menu.',
    'Warning': 'Expires in 3-7 days. Triggers a 25% discount in the Dynamic Yield Menu.',
    'Fresh': 'Item is fresh and has more than 7 days of shelf life remaining.'
  };

  // REFS

  // REFS
  const logEndRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const city = res.data.address.city || res.data.address.town || 'My Location';
            setLocName(city);
          } catch (e) {
            setLocName('My Location');
          }
        },
        () => setLocName(CITIES[0].name)
      );
    }
  }, []);

  // --- FORECASTING ---
  const handleForecast = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/predict`, formData);
      setTimeout(() => {
        setForecast(res.data);
        setLoading(false);
        setTimeout(() => {
          gsap.fromTo('.forecast-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
        }, 100);
      }, 1000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const laborForecast = forecast ? {
    lineCooks: Math.max(2, Math.ceil(forecast.predicted_headcount / 120)),
    prepCooks: Math.max(1, Math.ceil(forecast.predicted_headcount / 180)),
    dishwashers: Math.max(1, Math.ceil(forecast.predicted_headcount / 250)),
    servers: Math.max(3, Math.ceil(forecast.predicted_headcount / 40))
  } : null;

  // --- INVENTORY MANAGEMENT ---
  const addBatchItems = async () => {
    for (let item of batchItems) {
      if (!item.quantity) return alert("Fill quantity for all items");
      
      const orderDateObj = new Date(batchOrderDate);
      const expiryDays = itemExpiryDays[item.name] || 7;
      orderDateObj.setDate(orderDateObj.getDate() + expiryDays);
      const calcExpiry = orderDateObj.toISOString().split('T')[0];

      const batchData = {
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: INGREDIENT_UNITS[item.name],
        unitCost: INGREDIENT_COSTS[item.name],
        orderDate: batchOrderDate,
        expiryDate: calcExpiry
      };
      await axios.post(`${API_URL}/inventory/batches`, batchData, { headers: { 'x-user-id': userId }});
    }
    fetchBatches();
    setShowAddBatch(false);
    setBatchItems([{ name: 'Chicken', quantity: '' }]);
    gsap.fromTo('.batch-row', { backgroundColor: '#10b98133' }, { backgroundColor: 'transparent', duration: 1 });
  };

  const getIngredientTotals = () => {
    const totals = {};
    Object.keys(INGREDIENT_UNITS).forEach(k => totals[k] = 0);
    batches.forEach(b => { totals[b.name] += b.quantity; });
    return totals;
  };
  const totals = getIngredientTotals();

  const getExpiryStatus = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', label: 'Expired', diff };
    if (diff <= 3) return { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Critical', diff };
    if (diff <= 7) return { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', label: 'Warning', diff };
    return { color: 'text-emerald-500', bg: 'bg-stone-800/50 border-white/5', label: 'Fresh', diff };
  };

  const discardBatch = (id) => {
    gsap.to(`#batch-${id}`, { x: 50, opacity: 0, duration: 0.3, onComplete: async () => {
      try {
        await axios.delete(`${API_URL}/inventory/batches/${id}`, { headers: { 'x-user-id': userId }});
        fetchBatches();
      } catch(e) { console.error(e); }
    }});
  };

  useEffect(() => {
    const criticalBatches = batches.filter(b => getExpiryStatus(b.expiryDate).diff <= 2);
    if (criticalBatches.length > 0) {
      const msgs = criticalBatches.map(b => `${b.name} (Batch ${b.id.toString().slice(-4)}) is expiring in 2 days or less. Please remove it!`);
      setAlerts(prev => {
        let newAlerts = [...prev];
        let changed = false;
        msgs.forEach(m => { 
          if (!newAlerts.includes(m)) {
            newAlerts.unshift(m);
            changed = true;
          }
        });
        return changed ? newAlerts : prev;
      });
    }
  }, [batches]);

  // LIVE POS SIMULATION REMOVED
  // --- AUTOMATED PURCHASE ORDERS ---
  const generatePO = () => {
    const poItems = [];
    Object.keys(PAR_LEVELS).forEach(ing => {
      if (totals[ing] < PAR_LEVELS[ing]) {
        poItems.push({
          name: ing,
          current: totals[ing],
          par: PAR_LEVELS[ing],
          orderQty: PAR_LEVELS[ing] - totals[ing] + 5, // order slightly above par
          cost: (PAR_LEVELS[ing] - totals[ing] + 5) * INGREDIENT_COSTS[ing]
        });
      }
    });
    return poItems;
  };
  const poData = generatePO();
  const poTotal = poData.reduce((sum, item) => sum + item.cost, 0);

  // --- DYNAMIC PRICING (YIELD MANAGEMENT) ---
  const getYieldMenu = () => {
    const criticalIngs = batches.filter(b => {
      const diff = getExpiryStatus(b.expiryDate).diff;
      return diff <= 2;
    }).map(b => b.name);

    const warningIngs = batches.filter(b => {
      const diff = getExpiryStatus(b.expiryDate).diff;
      return diff > 2 && diff <= 7;
    }).map(b => b.name);
    
    // Only return items that have a warning ingredient AND do NOT have any critical/expired ingredients
    return MENU_ITEMS.filter(dish => {
      const hasWarning = dish.ingredients.some(ing => warningIngs.includes(ing.name));
      const hasCritical = dish.ingredients.some(ing => criticalIngs.includes(ing.name));
      return hasWarning && !hasCritical;
    }).map(dish => {
      return { ...dish, isSpecial: true, newPrice: Math.floor(dish.basePrice * 0.75) }; // 25% discount
    });
  };
  const yieldMenu = getYieldMenu();

  const scrollToDashboard = () => {
    document.getElementById('dashboard-section').scrollIntoView({ behavior: 'smooth' });
  };

  if (!userId) {
    return (
      <div className="bg-[#0c0a09] min-h-screen flex items-center justify-center text-stone-300 font-sans selection:bg-amber-500/30 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-amber-600/5 rounded-full blur-[120px]" />
        <form onSubmit={handleLogin} className="bg-[#1c1917]/80 backdrop-blur-xl border border-white/10 p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full z-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] mb-6">
            <Utensils size={32} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-serif text-white mb-2">Bavarchi</h1>
          <p className="text-sm text-stone-400 mb-8 uppercase tracking-widest">Global Kitchen System</p>
          <input 
            type="text" 
            value={loginInput}
            onChange={e => setLoginInput(e.target.value)}
            placeholder="Enter Restaurant ID"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-white mb-4 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-4 rounded-xl transition-colors">
            Access System
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0a09] min-h-screen text-stone-300 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-amber-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0c0a09]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Utensils size={20} className="text-amber-500" />
            </div>
            <span className="text-2xl font-serif text-white tracking-wide">Bavarchi</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-amber-500 uppercase tracking-widest">{userId}</span>
            <button onClick={handleLogout} className="text-xs text-stone-500 hover:text-white uppercase tracking-widest font-bold mr-4">Logout</button>
            <button onClick={() => setShowPO(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1c1917] border border-white/10 hover:border-amber-500/50 rounded-full text-sm font-medium transition-all group shadow-lg hover:shadow-amber-500/10">
              <ShoppingCart size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-stone-200">Draft PO</span>
            <span className="bg-amber-500 text-stone-900 px-2 py-0.5 rounded-full ml-1 font-bold">{poData.length}</span>
          </button>
          </div>
        </div>
      </nav>

      {/* PO MODAL */}
      {showPO && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1c1917] rounded-3xl p-8 w-full max-w-3xl shadow-2xl overflow-hidden relative border border-white/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-700" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-serif text-white flex items-center gap-3"><Receipt className="text-amber-500"/> Purchase Order</h2>
                <p className="text-stone-400 text-sm mt-2">Generated: {new Date().toLocaleDateString()} &bull; Vendor: Standard Supply</p>
              </div>
              <button onClick={() => setShowPO(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <table className="w-full text-left mb-8 text-sm">
              <thead>
                <tr className="border-b border-white/10 text-stone-400 font-medium">
                  <th className="pb-3 font-normal uppercase tracking-widest text-[10px]">Ingredient</th>
                  <th className="pb-3 font-normal uppercase tracking-widest text-[10px]">Current / Par</th>
                  <th className="pb-3 text-right font-normal uppercase tracking-widest text-[10px]">Order Qty</th>
                  <th className="pb-3 text-right font-normal uppercase tracking-widest text-[10px]">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {poData.map((item, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 text-white font-medium">{item.name}</td>
                    <td className="py-4 text-stone-500">{item.current.toFixed(1)} / {item.par}</td>
                    <td className="py-4 text-right text-amber-500 font-bold">{item.orderQty.toFixed(1)}</td>
                    <td className="py-4 text-right text-emerald-400">₹{item.cost.toFixed(2)}</td>
                  </tr>
                ))}
                {poData.length === 0 && <tr><td colSpan="4" className="py-8 text-center text-stone-500 italic">Inventory is sufficiently stocked.</td></tr>}
              </tbody>
            </table>
            
            <div className="flex justify-between items-center bg-black/40 p-6 rounded-2xl border border-white/5">
              <span className="text-stone-400 text-sm font-medium uppercase tracking-widest">Total Estimated Cost</span>
              <span className="text-3xl font-serif text-white">₹{poTotal.toFixed(2)}</span>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="bg-white hover:bg-stone-200 text-stone-900 font-bold px-8 py-3.5 rounded-full flex items-center gap-2 transition-colors">
                <Printer size={18} /> Print & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 flex items-center min-h-[85vh] z-10">
        <div className="max-w-[1600px] mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-amber-500 text-xs font-bold uppercase tracking-widest mb-6">
              Next-Gen Kitchen Intelligence
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white leading-[1.1] mb-6">
              Master the <br/>
              <span className="text-amber-500 italic">Art</span> of Operations.
            </h1>
            <p className="text-lg text-stone-400 mb-10 max-w-lg leading-relaxed">
              Bavarchi brings intelligence to the culinary world. Forecast demand with precision, eliminate food waste, and dynamically adapt your menus to maximize yield. The modern operating system for culinary excellence.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={scrollToDashboard} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                Launch Dashboard
              </button>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 blur-3xl rounded-full" />
            <div className="bg-[#1c1917]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl transform lg:rotate-2 hover:rotate-0 transition-transform duration-700 relative z-10">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h3 className="text-lg font-serif text-white flex items-center gap-2"><TrendingDown className="text-amber-500"/> Live Yield Pricing</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Active</span>
              </div>
              <div className="space-y-4">
                {yieldMenu.slice(0, 3).map((dish, i) => (
                  <div key={i} className={`flex justify-between items-center p-5 rounded-2xl border transition-colors ₹{dish.isSpecial ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/20 border-white/5'}`}>
                    <div>
                      <div className="text-white font-serif text-lg">{dish.name}</div>
                      {dish.isSpecial && <div className="text-xs text-amber-500 mt-1 flex items-center gap-1"><AlertTriangle size={12}/> Yield optimized</div>}
                    </div>
                    <div className="text-right">
                      {dish.isSpecial ? (
                        <>
                          <div className="text-sm text-stone-500 line-through">₹{dish.basePrice}</div>
                          <div className="text-2xl text-amber-400 font-bold">₹{dish.newPrice}</div>
                        </>
                      ) : (
                        <div className="text-2xl text-stone-300">₹{dish.basePrice}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD GRID - DENSE AND PROFESSIONAL */}
      <section id="dashboard-section" className="relative z-10 max-w-[1600px] mx-auto px-6 py-24 border-t border-white/5">
        <div className="mb-12">
          <h2 className="text-4xl font-serif text-white mb-3">Operations Center</h2>
          <p className="text-stone-400 text-lg">Control forecasting, inventory, and menu yield in real-time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COL 1: FORECASTING (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            <div className="bg-[#1c1917]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Target size={18} className="text-amber-500" /> Demand Engine
              </h3>
              
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Location</label>
                    <select className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors">
                      <option value={locName}>{locName}</option>
                      {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Event</label>
                    <select value={formData.special_event_type} onChange={e => setFormData({ ...formData, special_event_type: e.target.value })} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors">
                      <option value="Regular">Regular</option>
                      <option value="Holiday">Holiday</option>
                      <option value="Wedding_Banquet">Wedding</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Past Covers</label>
                    <input type="number" value={formData.previous_headcount} onChange={e => setFormData({ ...formData, previous_headcount: parseInt(e.target.value) || 0 })} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="e.g. 150" />
                  </div>
                </div>
                <button onClick={handleForecast} className={`mt-2 w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${loading ? 'bg-amber-900/50 text-amber-500' : 'bg-white text-stone-900 hover:bg-stone-200 hover:scale-[1.02]'}`}>
                  {loading ? <Activity size={18} className="animate-spin" /> : 'Run Forecast'}
                </button>
              </div>

              {forecast && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex flex-col gap-4">
                    <div className="bg-amber-500 p-6 rounded-2xl text-stone-900 relative overflow-hidden shadow-lg flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-widest opacity-80">Projected Covers</div>
                      <div className="text-6xl font-serif italic">{forecast.predicted_headcount}</div>
                    </div>
                    <div className="bg-emerald-900/40 border border-emerald-500/20 p-6 rounded-2xl">
                      <div className="text-xs font-bold uppercase tracking-widest mb-5 text-emerald-400">Staff Required</div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex justify-between items-center text-sm text-white border-b border-white/5 pb-3">
                          <span className="text-stone-300">Line Cooks</span> <strong className="text-emerald-400 text-2xl font-serif">{laborForecast.lineCooks}</strong>
                        </div>
                        <div className="flex justify-between items-center text-sm text-white border-b border-white/5 pb-3">
                          <span className="text-stone-300">Servers (FOH)</span> <strong className="text-emerald-400 text-2xl font-serif">{laborForecast.servers}</strong>
                        </div>
                        <div className="flex justify-between items-center text-sm text-white border-b border-white/5 pb-3">
                          <span className="text-stone-300">Prep Cooks</span> <strong className="text-emerald-400 text-2xl font-serif">{laborForecast.prepCooks}</strong>
                        </div>
                        <div className="flex justify-between items-center text-sm text-white border-b border-white/5 pb-3">
                          <span className="text-stone-300">Dishwashers</span> <strong className="text-emerald-400 text-2xl font-serif">{laborForecast.dishwashers}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NEW ITEM ENTRY BLOCK */}
            <div className="bg-[#1c1917]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Leaf size={18} className="text-emerald-500" /> New Item Registry
              </h3>
              <div className="flex flex-col gap-4">
                <input type="text" value={newItemDef.name} onChange={e => setNewItemDef({...newItemDef, name: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Ingredient Name (e.g. Garlic)" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={newItemDef.expiryDays} onChange={e => setNewItemDef({...newItemDef, expiryDays: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Shelf Life (Days)" />
                  <select value={newItemDef.type} onChange={e => setNewItemDef({...newItemDef, type: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="Vegetable">Vegetable</option>
                    <option value="Meat">Meat</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Dry Goods">Dry Goods</option>
                  </select>
                </div>
                <button onClick={addNewItemDefinition} className="mt-2 w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-white/10 hover:border-white/30">
                  Register Item
                </button>
              </div>
            </div>

          </div>

          {/* COL 2: INVENTORY BATCHES (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="bg-[#1c1917]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex-1 flex flex-col">
              
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                  <ShoppingCart size={18} className="text-blue-500" /> Active Batches
                </h3>
                <button onClick={() => setShowAddBatch(true)} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all border border-white/5 hover:border-white/20">
                  + Receive Order
                </button>
              </div>

              {/* ALERTS INLINE FOR INVENTORY */}
              {alerts.length > 0 && (
                <div className="mb-6 bg-red-950/40 border border-red-500/30 p-5 rounded-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2 mb-3">
                    <AlertOctagon size={14} /> Action Required
                  </h3>
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {alerts.map((a, i) => (
                      <div key={i} className="text-xs font-medium text-red-200 bg-black/40 p-2.5 rounded-lg border border-red-500/20">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAddBatch && (
                <div className="mb-8 bg-black/40 p-6 rounded-3xl border border-blue-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-5">
                     <span className="text-xs font-bold text-white uppercase tracking-widest">New Batch Entry</span>
                     <input type="date" value={batchOrderDate} onChange={e => setBatchOrderDate(e.target.value)} className="bg-transparent border-b border-stone-700 pb-1 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {batchItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.name} onChange={e => { 
                          const newItems = [...batchItems]; 
                          newItems[idx].name = e.target.value; 
                          setBatchItems(newItems); 
                        }} className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                          {Object.keys(INGREDIENT_UNITS).map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                        <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const newItems = [...batchItems]; newItems[idx].quantity = e.target.value; setBatchItems(newItems); }} className="w-20 bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500" />
                        {batchItems.length > 1 && (
                          <button onClick={() => { const newItems = batchItems.filter((_, i) => i !== idx); setBatchItems(newItems); }} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16}/></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-5 border-t border-white/10">
                    <button onClick={() => setBatchItems([...batchItems, { name: 'Chicken', quantity: '' }])} className="text-blue-400 text-xs font-bold hover:text-blue-300 uppercase tracking-widest">+ Item</button>
                    <div className="flex gap-3">
                      <button onClick={() => setShowAddBatch(false)} className="text-stone-400 text-xs hover:text-white px-4 py-2 font-bold uppercase tracking-widest">Cancel</button>
                      <button onClick={addBatchItems} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors">Submit</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
                {batches.map(batch => {
                  const status = getExpiryStatus(batch.expiryDate);
                  return (
                    <div key={batch.id} id={`batch-${batch.id}`} className={`batch-row group relative overflow-hidden flex flex-col p-6 rounded-[1.5rem] border ${status.bg} backdrop-blur-sm transition-all hover:bg-white/5`}>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-serif text-2xl text-white">{batch.name}</span>
                        <div className="relative">
                          <button 
                            onClick={() => setActiveTooltip(activeTooltip === batch.id ? null : batch.id)}
                            className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full ${status.color} bg-black/40 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors`}
                          >
                            {status.label}
                          </button>
                          {activeTooltip === batch.id && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1c1917] border border-white/10 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                              <p className="text-xs text-stone-300 normal-case tracking-normal leading-relaxed">{TOOLTIP_TEXTS[status.label]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-stone-400 uppercase tracking-widest mb-1">Quantity</div>
                          <div className="text-white font-medium text-lg">{batch.quantity.toFixed(1)} <span className="text-stone-500 text-sm">{batch.unit}</span></div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs text-stone-400 uppercase tracking-widest mb-1">Expires</div>
                           <div className="text-white font-medium text-lg">{new Date(batch.expiryDate).toLocaleDateString('en-GB')}</div>
                        </div>
                        <button onClick={() => discardBatch(batch.id)} className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* COL 3: YIELD MENU (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="bg-[#1c1917]/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex-1 flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-8 flex items-center gap-2">
                <DollarSign size={18} className="text-amber-500" /> Yield Menu
              </h3>
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {yieldMenu.map((dish, i) => (
                  <div key={dish.name} className={`p-6 rounded-[1.5rem] border transition-all ₹{dish.isSpecial ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-black/20 border-white/5'}`}>
                    <h4 className="font-serif text-xl text-white mb-4">{dish.name}</h4>
                    <div className="flex justify-between items-end">
                      {dish.isSpecial ? (
                        <>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">Special</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-stone-500 line-through mb-1">₹{dish.basePrice}</span>
                            <span className="text-3xl font-bold text-amber-400">₹{dish.newPrice}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold px-1">Standard</span>
                          <span className="text-2xl font-medium text-stone-300">₹{dish.basePrice}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-20 py-10 text-center text-stone-500 text-sm relative z-10">
        <p className="flex items-center justify-center gap-2">
          <Utensils size={14} className="text-stone-600"/>
          &copy; {new Date().getFullYear()} Bavarchi Culinary Systems. All rights reserved.
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
