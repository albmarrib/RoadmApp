import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { useAuthStore } from '../../../store/authStore';
import { motion } from 'framer-motion';
import { Map, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setProfile } = useAuthStore();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });

      // Core SaaS Requirement: Se establece hasPaid en false
      // Solo tras pagar por Stripe/otra pasarela, se actualizaría a true en Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        hasPaid: false, 
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      setProfile(userDoc);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al crear la cuenta.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl"
    >
      <h2 className="text-3xl font-bold text-center text-white mb-2">Comienza tu viaje</h2>
      <p className="text-slate-400 text-center mb-8">Crea una cuenta para acceder a RoadmApp.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
            placeholder="Tu nombre"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
            placeholder="tu@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-3 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex justify-center items-center gap-2 mt-4"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-slate-400 mt-6 text-sm">
        ¿Ya tienes cuenta? <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">Inicia sesión</Link>
      </p>
    </motion.div>
  );
}
