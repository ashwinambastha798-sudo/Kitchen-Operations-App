import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Float, SpotLight } from '@react-three/drei';
import { Activity, Target, Flame, ChevronRight, Zap, CloudRain, Sun, Droplets, MapPin, CheckCircle } from 'lucide-react';

const API_URL = "http://localhost:8000/api";

const CITIES = [
  { name: 'Mumbai, IN', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi, IN', lat: 28.6139, lon: 77.2090 },
  { name: 'Bangalore, IN', lat: 12.9716, lon: 77.5946 },
];

// --- 3D Components ---
function CrystallineCore() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} position={[3, 0, 0]} scale={2.5}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          thickness={1.5}
          chromaticAberration={1}
          anisotropy={0.5}
          distortion={0.5}
          distortionScale={0.5}
          temporalDistortion={0.1}
          color="#8b5cf6"
          attenuationDistance={1}
          attenuationColor="#60a5fa"
        />
      </mesh>
    </Float>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <SpotLight position={[0, 10, 0]} angle={0.6} penumbra={1} intensity={3} color="#8b5cf6" distance={20} volumetric />
      <SpotLight position={[5, 5, 5]} angle={0.5} penumbra={0.5} intensity={2} color="#3b82f6" />
      <Environment preset="city" />
    </>
  );
}

// --- Helpers ---
function NeonCounter({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, value, { duration: 2, ease: "circOut" });
    return animation.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

// --- Main App ---
export default function App() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: tomorrowStr,
    latitude: CITIES[0].lat,
    longitude: CITIES[0].lon,
    special_event_type: 'Regular',
    Previous_Turnout: 'MEDIUM'
  });
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locName, setLocName] = useState('Getting Location...');

  const [inventoryItems, setInventoryItems] = useState([
    { name: 'Bread', checked: false, quantity: 10, unit: 'kg', expiryDate: '' },
    { name: 'Milk', checked: false, quantity: 5, unit: 'liters', expiryDate: '' },
    { name: 'Chicken', checked: false, quantity: 20, unit: 'kg', expiryDate: '' },
    { name: 'Fish', checked: false, quantity: 15, unit: 'kg', expiryDate: '' },
    { name: 'Flour', checked: false, quantity: 50, unit: 'kg', expiryDate: '' },
    { name: 'Pasta', checked: false, quantity: 40, unit: 'kg', expiryDate: '' },
    { name: 'Tomatoes', checked: false, quantity: 25, unit: 'kg', expiryDate: '' },
    { name: 'Cheese', checked: false, quantity: 10, unit: 'kg', expiryDate: '' },
    { name: 'Mutton', checked: false, quantity: 30, unit: 'kg', expiryDate: '' },
    { name: 'Eggs', checked: false, quantity: 10, unit: 'kg', expiryDate: '' }
  ]);
  const [inventoryRecommendations, setInventoryRecommendations] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const city = res.data.address.city || res.data.address.town || res.data.address.village || 'My Location';
            setLocName(city);
          } catch (e) {
            setLocName('My Location');
          }
        },
        () => setLocName(CITIES[0].name)
      );
    }
  }, []);

  const handleForecast = async () => {
    setLoading(true);
    setForecast(null);
    try {
      const res = await axios.post(`${API_URL}/predict`, formData);
      setTimeout(() => {
        setForecast(res.data);
        setLoading(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleInventoryAction = async () => {
    if (!forecast || !forecast.predicted_headcount) {
        alert("Please generate a headcount forecast first!");
        return;
    }
    
    setLoadingInventory(true);
    let hasError = false;
    const newItems = [...inventoryItems];

    for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        item.error = '';
        if (!item.checked) continue;

        if (!item.quantity || item.quantity <= 0) {
            item.error = "Please write the quantity properly.";
            hasError = true;
        } else if (!item.expiryDate) {
            item.error = "Please mention the expiry date properly.";
            hasError = true;
        } else {
            const expDate = new Date(item.expiryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 2);
            maxDate.setHours(0, 0, 0, 0);
            
            if (expDate < today) {
                item.error = "Warning: Date in past. Throw ingredient into garbage and provide proper date.";
                hasError = true;
            } else if (expDate > maxDate) {
                item.error = "Not possible this much expiry date.";
                hasError = true;
            }
        }
    }

    setInventoryItems(newItems);

    if (hasError) {
        setLoadingInventory(false);
        return;
    }

    const activeCheckedItems = newItems.filter(item => item.checked);
    if (activeCheckedItems.length === 0) {
        alert("Please select at least one inventory item.");
        setLoadingInventory(false);
        return;
    }

    const activeItems = activeCheckedItems.map(item => {
        let days = 5; // default fallback
        if (item.expiryDate) {
            const exp = new Date(item.expiryDate);
            const now = new Date();
            const diffTime = exp - now;
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
        return {
            name: item.name,
            category: "GENERAL",
            shelf_life_days: days,
            quantity: Number(item.quantity) || 0,
            unit: item.unit
        };
    });

    try {
        const payload = {
            headcount: forecast.predicted_headcount,
            items: activeItems
        };
        const res = await axios.post(`${API_URL}/inventory-action`, payload);
        setTimeout(() => {
            const sortedRecommendations = [...res.data.recommendations].sort((a, b) => a.days_to_expiry - b.days_to_expiry);
            setInventoryRecommendations(sortedRecommendations);
            setLoadingInventory(false);
        }, 1000);
    } catch (err) {
        console.error(err);
        setLoadingInventory(false);
    }
  };

  const InputWrapper = ({ label, icon: Icon, children }) => (
    <div className="flex flex-col space-y-2">
      <label className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold flex items-center gap-2">
        <Icon size={12} className="text-blue-400" />
        {label}
      </label>
      {children}
    </div>
  );

  const glassPanel = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl";

  return (
    <div className="min-h-screen bg-[#050510] text-slate-200 font-sans selection:bg-purple-500/30 overflow-hidden relative">

      {/* 3D CANVAS BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <SceneLights />
          <CrystallineCore />
        </Canvas>
      </div>

      {/* FOREGROUND UI OVERLAY */}
      <div className="relative z-10 h-screen overflow-y-auto flex flex-col p-6 lg:p-12 custom-scrollbar pb-64">

        <header className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2"
          >
            Kitchen <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Operations</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm uppercase tracking-[0.3em] text-white/40"
          >
            Headcount Prediction Engine
          </motion.p>
        </header>

        {/* INLINE LIVE WEATHER TICKER (MOVED TO TOP) */}
        {forecast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[1600px] mx-auto mb-10 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center px-8 overflow-hidden"
          >
            <div className="flex items-center flex-wrap gap-x-12 gap-y-4 text-sm font-mono text-white/70 uppercase tracking-widest">
              <span className="flex items-center gap-3">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                LIVE WEATHER
              </span>
              <span className="flex items-center gap-2"><MapPin size={16} className="text-blue-400" /> {locName}</span>
              <span className="flex items-center gap-2"><Sun size={16} className="text-yellow-400" /> {forecast.temperature_C}°C PEAK</span>
              <span className="flex items-center gap-2">{forecast.is_raining ? <CloudRain size={16} className="text-blue-400" /> : <Droplets size={16} className="text-blue-400" />} {forecast.humidity_percent}% HUMIDITY</span>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-10 w-full max-w-[1600px] mx-auto">
          {/* TOP ROW: HEADCOUNT PREDICTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full">

            {/* REGRESSION MODEL INPUTS PANEL (LEFT) */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`lg:col-span-4 ${glassPanel} p-8 flex flex-col space-y-6 relative overflow-hidden`}
            >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />

            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2 flex items-center gap-2">
              <Target size={16} className="text-blue-400" /> Forecasting Inputs
            </h2>

            <InputWrapper label="Location" icon={MapPin}>
              <select
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-400 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                onChange={e => {
                  const c = CITIES.find(x => x.name === e.target.value);
                  if (c) setFormData({ ...formData, latitude: c.lat, longitude: c.lon });
                }}
              >
                <option disabled>Select Location</option>
                <option value={locName} className="bg-[#050510] text-blue-300">{locName}</option>
                {CITIES.map(c => <option key={c.name} value={c.name} className="bg-[#050510]">{c.name}</option>)}
              </select>
            </InputWrapper>

            <InputWrapper label="Date" icon={Activity}>
              <input
                type="date"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-400 outline-none transition-all shadow-inner"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </InputWrapper>

            <InputWrapper label="Special Event" icon={Zap}>
              <select
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-400 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                value={formData.special_event_type}
                onChange={e => setFormData({ ...formData, special_event_type: e.target.value })}
              >
                <option value="Regular" className="bg-[#050510]">Regular Day</option>
                <option value="Corporate_Event" className="bg-[#050510]">Corporate Event</option>
                <option value="Holiday" className="bg-[#050510]">Holiday</option>
                <option value="Wedding_Banquet" className="bg-[#050510]">Wedding/Banquet</option>
              </select>
            </InputWrapper>

            <InputWrapper label="Previous Day Turnout" icon={Flame}>
              <select
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-400 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                value={formData.Previous_Turnout}
                onChange={e => setFormData({ ...formData, Previous_Turnout: e.target.value })}
              >
                <option value="LOW" className="bg-[#050510]">Low</option>
                <option value="MEDIUM" className="bg-[#050510]">Medium</option>
                <option value="HIGH" className="bg-[#050510]">High</option>
              </select>
            </InputWrapper>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleForecast}
              className={`mt-4 w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all ${loading
                ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-white/10'
                }`}
            >
              {loading ? <Activity size={16} className="animate-spin" /> : <>Predict Headcount <ChevronRight size={16} /></>}
            </motion.button>
          </motion.div>

          {/* REGRESSION OUTPUT HUD (CENTER/RIGHT) */}
          <div className="lg:col-span-8 flex flex-col space-y-6 pointer-events-none">
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center pointer-events-auto">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`${glassPanel} p-8 flex items-center justify-center gap-4`}>
                  <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" />
                  <div className="w-4 h-4 rounded-full bg-purple-400 animate-bounce delay-100" />
                  <div className="w-4 h-4 rounded-full bg-pink-400 animate-bounce delay-200" />
                </motion.div>
              </div>
            )}

            {forecast && !loading && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="pointer-events-auto space-y-6"
              >
                {/* HEADCOUNT CARD */}
                <motion.div className={`${glassPanel} p-10 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                  <h3 className="text-xs uppercase tracking-[0.3em] text-blue-300 font-bold mb-8">Prediction Complete</h3>

                  <div className="flex flex-wrap items-end gap-6 mb-8">
                    <h2 className="text-8xl md:text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <NeonCounter value={forecast.predicted_headcount} />
                    </h2>
                    <span className="text-3xl font-bold text-white/30 uppercase tracking-widest pb-4">People Expected</span>
                  </div>

                  <div className="inline-flex items-center gap-3 px-6 py-4 bg-purple-500/10 border border-purple-500/20 rounded-xl backdrop-blur-md">
                    <CheckCircle size={18} className="text-purple-400" />
                    <p className="text-sm font-semibold text-purple-100 tracking-wide">{forecast.inventory_action}</p>
                  </div>
                </motion.div>

              </motion.div>
            )}
          </div>
          </div>

          {/* --- NEW INVENTORY UI BLOCK --- */}
          {forecast && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full pointer-events-auto">
              {/* INVENTORY INPUT PANEL */}
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className={`lg:col-span-6 ${glassPanel} p-8 flex flex-col space-y-6 relative overflow-hidden`}
              >
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-2 flex items-center gap-2">
                <Target size={16} className="text-pink-400" /> Live Inventory Input
              </h2>
              <div className="grid grid-cols-2 gap-4 items-start">
                {inventoryItems.map((item, idx) => (
                  <div key={item.name} className={`flex flex-col gap-2 p-4 rounded-xl border transition-all h-max ${item.checked ? 'bg-pink-500/10 border-pink-500/30' : 'bg-black/20 border-white/5'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={item.checked}
                        onChange={(e) => {
                          const newItems = [...inventoryItems];
                          newItems[idx].checked = e.target.checked;
                          if (!e.target.checked) {
                              newItems[idx].quantity = 0;
                              newItems[idx].expiryDate = '';
                          }
                          setInventoryItems(newItems);
                        }}
                        className="w-4 h-4 text-pink-500 bg-black/50 border-white/20 rounded focus:ring-pink-500 focus:ring-2"
                      />
                      <span className="text-sm font-semibold text-white">{item.name}</span>
                    </label>
                    {item.checked && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-col gap-3 mt-2">
                        <div className="flex items-center gap-3">
                          <input type="number" min="0" step="0.1" value={item.quantity} onChange={e => { const val = Math.max(0, parseFloat(e.target.value) || 0); const n = [...inventoryItems]; n[idx].quantity = val; n[idx].error = ''; setInventoryItems(n); }} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" placeholder="Quantity" />
                          <span className="text-xs text-white/50">{item.unit}</span>
                        </div>
                        <label className="text-[10px] text-white/50 uppercase tracking-widest mt-1 -mb-1">Expiry Date:</label>
                        <input type="date" value={item.expiryDate} onChange={e => { const n = [...inventoryItems]; n[idx].expiryDate = e.target.value; n[idx].error = ''; setInventoryItems(n); }} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white cursor-pointer" />
                        {item.error && <p className="text-red-400 text-xs font-semibold">{item.error}</p>}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInventoryAction}
                className={`mt-4 w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all ${loadingInventory ? 'bg-pink-900/50 text-pink-300' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)]'}`}
              >
                {loadingInventory ? <Activity size={16} className="animate-spin" /> : <>Generate Menu Recommendations <ChevronRight size={16} /></>}
              </motion.button>
            </motion.div>

            {/* AI MENU RECOMMENDATIONS PANEL */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
              {inventoryRecommendations && (
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className={`${glassPanel} p-8`}>
                  <h3 className="text-xs uppercase tracking-[0.3em] text-pink-300 font-bold mb-6 flex items-center gap-2">
                    <Activity size={16} className="text-pink-400" /> AI Menu Recommendations
                  </h3>
                  <div className="space-y-4">
                    {inventoryRecommendations.map((rec, i) => (
                      <div key={i} className="p-5 rounded-xl border bg-white/5 border-white/10 relative">
                        {rec.days_to_expiry < 7 && (
                           <div className="absolute -top-3 -right-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)] border border-pink-400/50 animate-pulse">
                              Discount
                           </div>
                        )}
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-white text-lg">{rec.ingredient} <span className="text-xs text-white/50 font-normal ml-2">({rec.quantity_available} {rec.unit}, expires in {rec.days_to_expiry} days)</span></span>
                        </div>
                        <p className="text-sm text-slate-300 mb-3"><strong className="text-white">Action:</strong> {rec.action_required}</p>
                        <div className="inline-block w-full px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Suggested Recipe for {forecast.predicted_headcount} Guests:</span>
                          <p className="text-white font-semibold mt-1">{rec.suggested_recipe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }
      `}} />
    </div>
  );
}
