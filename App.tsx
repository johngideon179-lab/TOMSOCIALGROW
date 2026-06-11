import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Order, OrderStatus, Platform, Transaction, Ticket 
} from './types';
import { PLATFORM_LOGOS, PLATFORM_CATEGORIES, PLATFORM_QUANTITIES } from './constants';
import { 
  HomeIcon, ShoppingCartIcon, ClockIcon, WalletIcon, 
  ChatBubbleLeftRightIcon, 
  ArrowRightOnRectangleIcon, Bars3Icon, SunIcon, MoonIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon, UsersIcon, CheckIcon, QuestionMarkCircleIcon,
  ClipboardIcon, CodeBracketIcon, SparklesIcon, ShareIcon,
  CommandLineIcon, PencilSquareIcon, ClipboardDocumentCheckIcon,
  ArrowUpTrayIcon, EyeIcon, InformationCircleIcon,
  ArrowPathIcon, PresentationChartLineIcon
} from '@heroicons/react/24/outline';

import AnalyticsPage from './AnalyticsPage';

// --- Firebase Imports ---
import { auth, db, signInWithGoogle } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, getDoc, getDocs, setDoc, onSnapshot, collection, query, where, orderBy, 
  updateDoc, addDoc, getDocFromServer, serverTimestamp, runTransaction 
} from 'firebase/firestore';

// --- Global State & Persistence ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  authLoading: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const ADMIN_CREDENTIALS = {
  email: 'johngideon179@gmail.com',
  password: 'Ellabike'
};

const generateID = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// --- App Provider ---

const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthLoading(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to own user document
        const unsubUser = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`));

        setAuthLoading(false);
        return () => unsubUser();
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Global Listeners (Shared data)
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setTransactions([]);
      setTickets([]);
      setUsers([]);
      return;
    }

    // Orders Listener
    let ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    if (user.role !== 'admin') {
      ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
    }
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => doc.data() as Order));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    // Transactions Listener
    let txQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    if (user.role !== 'admin') {
      txQuery = query(collection(db, 'transactions'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
    }
    const unsubTx = onSnapshot(txQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Users Listener (Admin only)
    let unsubUsers = () => {};
    if (user.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as User));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    }

    return () => {
      unsubOrders();
      unsubTx();
      unsubUsers();
    };
  }, [user]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <AppContext.Provider value={{ 
      user, setUser, users, setUsers, orders, setOrders, transactions, setTransactions,
      tickets, setTickets, darkMode, setDarkMode, isSidebarOpen, setIsSidebarOpen,
      authLoading, showToast
    }}>
      {children}
      
      {/* Sleek Floating Custom Toast Notification overlay to replace standard window alerts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-4 rounded-[22px] border shadow-2xl backdrop-blur-md max-w-sm w-[90%] md:w-auto"
            style={{
              backgroundColor: toast.type === 'success' 
                ? 'rgba(12, 45, 23, 0.95)' 
                : toast.type === 'error'
                ? 'rgba(67, 12, 12, 0.95)' 
                : 'rgba(21, 23, 35, 0.95)',
              borderColor: toast.type === 'success'
                ? 'rgba(34, 197, 94, 0.3)'
                : toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(168, 85, 247, 0.3)',
            }}
          >
            {toast.type === 'success' && (
              <span className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 font-bold text-xs">✓</span>
            )}
            {toast.type === 'error' && (
              <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-xs">✕</span>
            )}
            {toast.type === 'info' && (
              <span className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs">ℹ</span>
            )}
            <p className="text-[11px] font-extrabold tracking-wide text-white flex-1 leading-tight">{toast.message}</p>
            <button 
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white text-sm font-black pl-2 pr-1"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
};


// --- Referral Routing ---
const ReferralRedirect = () => {
  const { refCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('referredByCode', refCode);
    }
    navigate('/login', { replace: true });
  }, [refCode, navigate]);

  return (
    <div className="min-h-screen bg-[#05060A] flex items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};


// --- Authentication Flow ---

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        navigate('/dashboard');
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const refCode = localStorage.getItem('referredByCode') || undefined;
        const newUser: User = {
          id: result.user.uid,
          username: formData.email.split('@')[0],
          email: formData.email,
          role: formData.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() ? 'admin' : 'user',
          balance: 0,
          apiKey: generateID('KEY'),
          referralCode: generateID('REF'),
          referralEarnings: 0,
          createdAt: new Date().toISOString(),
          ...(refCode ? { referredBy: refCode } : {})
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
        localStorage.removeItem('referredByCode'); // consume code
        navigate('/dashboard');
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError('');
    try {
      const firebaseUser = await signInWithGoogle();
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const refCode = localStorage.getItem('referredByCode') || undefined;
        const newUser: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: firebaseUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() ? 'admin' : 'user',
          balance: 0,
          apiKey: generateID('KEY'),
          referralCode: generateID('REF'),
          referralEarnings: 0,
          createdAt: new Date().toISOString(),
          ...(refCode ? { referredBy: refCode } : {})
        };
        await setDoc(userDocRef, newUser);
        localStorage.removeItem('referredByCode');
      }
      navigate('/dashboard');
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05060A] p-6 text-white font-['Inter']">
      <div className="max-w-md w-full bg-[#0D0F18] rounded-[40px] p-10 border border-white/5 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-6 shadow-lg shadow-purple-900/30">T</div>
          <h2 className="text-3xl font-black tracking-tight">{isLogin ? 'Welcome Back' : 'Join TomSociaGrow'}</h2>
          <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-[0.2em] font-black opacity-80">Global SMM Terminal</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-4 py-5 bg-white text-black rounded-2xl font-black text-sm transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-50"
          >
            {isGoogleLoading ? (
               <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.71 11 24 11c3.54 0 6.71 1.22 9.21 3.6z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-white/5"></div>
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Secure Email Login</span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              (authError.toLowerCase().includes('unauthorized-domain') || authError.toLowerCase().includes('unauthorized') || authError.toLowerCase().includes('domain')) ? (
                <div className="bg-purple-950/40 border border-purple-500/35 p-5 rounded-3xl text-left space-y-4 shadow-inner">
                  <p className="text-purple-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                    Firebase Authorization Steps Needed
                  </p>
                  
                  <div className="space-y-4 text-[11px] text-gray-300 font-semibold leading-relaxed">
                    <p>To let <strong className="text-white">ANYONE</strong> continue with Google, follow these simple steps:</p>
                    
                    <ol className="list-decimal pl-4 space-y-2 text-gray-400">
                      <li>
                        Click the <strong className="text-purple-400">Open Firebase Settings</strong> button below.
                      </li>
                      <li>
                        Scroll down to the <strong className="text-white">Authorized domains</strong> section.
                      </li>
                      <li>
                        Click <strong className="text-purple-400">Add domain</strong> and copy-paste these domains:
                        <div className="bg-[#05060A]/80 border border-white/5 p-3 rounded-xl font-mono text-[9px] text-purple-300 space-y-2 break-all mt-1 select-all select-text">
                          {window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                            <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg">
                              <span className="text-amber-400 font-bold block text-[8px] uppercase tracking-wider mb-0.5">👉 CURRENT ACTIVE DOMAIN (ADD THIS!):</span>
                              <span className="text-white font-black text-xs select-all">{window.location.hostname}</span>
                            </div>
                          )}
                          <div>• <span className="text-white">ais-pub-s4awj6r6eplr4dd2pgjeuy-288691445411.europe-west2.run.app</span> <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1 py-0.2 rounded font-sans uppercase font-black">Published Prod</span></div>
                          <div>• <span className="text-white">ais-dev-s4awj6r6eplr4dd2pgjeuy-288691445411.europe-west2.run.app</span> <span className="text-[8px] bg-[#1a1b26] text-gray-500 border border-white/5 px-1 py-0.2 rounded font-sans uppercase font-black">Development</span></div>
                          <div>• <span className="text-white">ais-pre-s4awj6r6eplr4dd2pgjeuy-288691445411.europe-west2.run.app</span> <span className="text-[8px] bg-[#1a1b26] text-gray-500 border border-white/5 px-1 py-0.2 rounded font-sans uppercase font-black">Preview</span></div>
                          <div>• <span className="text-white">ais-shared-s4awj6r6eplr4dd2pgjeuy-288691445411.europe-west2.run.app</span> <span className="text-[8px] bg-[#1a1b26] text-gray-500 border border-white/5 px-1 py-0.2 rounded font-sans uppercase font-black">Shared</span></div>
                          <div>• <span className="text-white">ais-mob-s4awj6r6eplr4dd2pgjeuy-288691445411.europe-west2.run.app</span> <span className="text-[8px] bg-[#1a1b26] text-gray-500 border border-white/5 px-1 py-0.2 rounded font-sans uppercase font-black">Mobile</span></div>
                        </div>
                      </li>
                      <li>
                        Click <strong className="text-white">Add</strong> then click <strong className="text-white">Save</strong>. Return here and sign in instantly!
                      </li>
                    </ol>

                    <div className="bg-purple-950/60 border border-purple-500/20 p-3 rounded-2xl space-y-2 mt-2">
                      <p className="text-xs font-black text-amber-400 uppercase tracking-wide">⚠️ Common Pitfalls / Fixes:</p>
                      <ul className="list-disc pl-4 space-y-1.5 text-gray-400 text-[10px]">
                        <li>
                          <strong className="text-white">No "https://" or slashes:</strong> Do NOT paste <code className="text-red-400 font-mono">https://ais-dev-.../</code>. Paste ONLY the exact domain text starting with <code className="text-emerald-400 font-mono">ais-dev-...</code> and ending with <code className="text-emerald-400 font-mono">.app</code> or your custom domain name without any trailing slashes.
                        </li>
                        <li>
                          <strong className="text-white">Propagation Delay:</strong> Firebase changes can take <strong className="text-white">2–5 minutes</strong> to register globally. Refresh the page after saving.
                        </li>
                        <li>
                          <strong className="text-white">Direct Email Workaround:</strong> Click <em className="text-purple-300">"New user? Join the network"</em> below and register with an email/password. This bypasses Google authentication settings entirely!
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <a 
                      href="https://console.firebase.google.com/project/gen-lang-client-0086490370/authentication/settings" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block text-center w-full py-3.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-500/30 transition-all font-mono"
                    >
                      🔗 Open Firebase Settings
                    </a>
                    <div className="text-center text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                      Or create an email / password account below!
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{authError}</p>
              )
            )}
            <input 
              required type="email" 
              placeholder="Email Address" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full bg-[#161924] border border-white/5 rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-purple-600 text-sm font-medium transition-all" 
            />
            <input 
              required type="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              className="w-full bg-[#161924] border border-white/5 rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-purple-600 text-sm font-medium transition-all" 
            />
            <button type="submit" className="w-full py-5 bg-purple-600 rounded-2xl font-black text-lg shadow-xl shadow-purple-900/20 hover:bg-purple-700 active:scale-95 transition-all">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="text-center pt-8">
            <button onClick={() => setIsLogin(!isLogin)} className="text-purple-500 font-black text-[10px] uppercase tracking-[0.2em] hover:text-purple-400 transition-colors">
              {isLogin ? "New user? Join the network" : "Already registered? Login here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard & Navigation ---

const Header = () => {
  const { user, setDarkMode, darkMode, setIsSidebarOpen } = useApp();
  return (
    <header className="sticky top-0 z-30 w-full h-24 bg-[#05060A]/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 lg:px-14 flex items-center justify-between text-white">
      <div className="flex items-center gap-8">
        <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white/5 rounded-2xl lg:hidden hover:bg-white/10 transition-colors"><Bars3Icon className="w-6 h-6" /></button>
        <div className="bg-purple-600/10 border border-purple-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
          <WalletIcon className="w-5 h-5 text-purple-500" />
          <span className="text-xl font-black tracking-tight text-purple-500">₦{(user?.balance || 0).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all">{darkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}</button>
        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-lg uppercase shadow-lg shadow-purple-900/20 border-2 border-white/5">
          {user?.username.charAt(0)}
        </div>
      </div>
    </header>
  );
};

const Sidebar = () => {
  const { user, isSidebarOpen, setIsSidebarOpen, setUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === 'admin' ? [
    { name: 'Admin Hub', path: '/admin', icon: HomeIcon },
    { name: 'User Database', path: '/admin/users', icon: UsersIcon },
    { name: 'Pending Orders', path: '/admin/pending', icon: ArrowPathIcon },
    { name: 'Global Orders', path: '/admin/orders', icon: AdjustmentsHorizontalIcon },
    { name: 'Transactions', path: '/admin/payments', icon: BanknotesIcon },
  ] : [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Analytics', path: '/analytics', icon: PresentationChartLineIcon },
    { name: 'New Boost', path: '/new-order', icon: ShoppingCartIcon },
    { name: 'My History', path: '/orders', icon: ClockIcon },
    { name: 'Wallet', path: '/wallet', icon: WalletIcon },
    { name: 'Referral', path: '/affiliate', icon: SparklesIcon },
    { name: 'Support', path: '/support', icon: ChatBubbleLeftRightIcon },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#0D0F18] border-r border-white/5 z-50 transform transition-transform duration-500 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-8 text-white">
          <Link to="/" className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-purple-900/20">T</div>
            <span className="text-2xl font-black tracking-tight">SociaGrow</span>
          </Link>
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {items.map((i) => (
              <Link 
                key={i.path} 
                to={i.path} 
                onClick={() => setIsSidebarOpen(false)} 
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${location.pathname === i.path ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <i.icon className="w-5 h-5" />
                {i.name}
              </Link>
            ))}
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-4 w-full px-6 py-4 text-red-500 hover:bg-red-500/10 rounded-2xl font-black text-[10px] uppercase mt-10 tracking-widest transition-all">
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

const PrivateLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, authLoading } = useApp();
  
  if (authLoading) return (
    <div className="min-h-screen bg-[#05060A] flex items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-[#05060A] flex transition-all duration-500 font-['Inter']">
      <Sidebar />
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-8 lg:p-14 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Main Views ---

const Dashboard = () => {
  const { user, orders, transactions } = useApp();
  const myOrders = orders.filter(o => o.userId === user?.id);
  const activeRuns = myOrders.filter(o => o.status !== OrderStatus.COMPLETED).length;

  return (
    <div className="space-y-12 text-white animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black tracking-tight">System Overview</h1>
           <p className="text-gray-500 text-xs font-black uppercase mt-2 tracking-widest">Active Operator: <span className="text-purple-500">{user?.username}</span></p>
        </div>
        <Link to="/new-order" className="bg-purple-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 hover:scale-105 transition-transform flex items-center gap-3">
          <ShoppingCartIcon className="w-5 h-5" />
          Quick Launch
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl group hover:border-purple-600/30 transition-all">
           <WalletIcon className="w-10 h-10 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available Credit</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">₦{(user?.balance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl group hover:border-purple-600/30 transition-all">
           <ClockIcon className="w-10 h-10 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ongoing Runs</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">{activeRuns}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl group hover:border-purple-600/30 transition-all">
           <UsersIcon className="w-10 h-10 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Affiliate Bonus</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">₦{(user?.referralEarnings || 0).toLocaleString()}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl group hover:border-purple-600/30 transition-all">
           <CheckIcon className="w-10 h-10 text-pink-500 mb-4 group-hover:scale-110 transition-transform" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Completed</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">{myOrders.filter(o => o.status === OrderStatus.COMPLETED).length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0D0F18] rounded-[45px] p-10 border border-white/5 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight">Recent Tasks</h3>
              <Link to="/orders" className="text-[10px] font-black text-purple-500 uppercase tracking-widest hover:underline">Full Audit</Link>
           </div>
           <div className="space-y-4">
             {myOrders.slice(0, 4).map(o => (
               <div key={o.id} className="p-6 bg-[#161924] rounded-3xl flex items-center justify-between border border-white/5 hover:border-purple-500/20 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-[#0D0F18] rounded-xl text-purple-500">{PLATFORM_LOGOS[o.platform]}</div>
                     <div>
                        <p className="text-sm font-black">{o.service}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{o.id}</p>
                     </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border ${o.status === OrderStatus.COMPLETED ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>{o.status}</span>
               </div>
             ))}
             {myOrders.length === 0 && <p className="text-center py-10 opacity-20 font-black">No boost activity logged.</p>}
           </div>
        </div>
        <div className="bg-[#0D0F18] rounded-[45px] p-10 border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-20 h-20 bg-purple-600/10 rounded-full flex items-center justify-center border border-purple-500/20">
              <SparklesIcon className="w-10 h-10 text-purple-500" />
           </div>
           <h4 className="text-xl font-black tracking-tight">Need a Refill?</h4>
           <p className="text-xs text-gray-500 leading-relaxed font-medium">Most of our services come with a 30-90 day guarantee. If you notice a drop, our support team will top it up for free.</p>
           <Link to="/support" className="w-full py-4 bg-purple-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Contact Guard</Link>
        </div>
      </div>
    </div>
  );
};

// --- Order System ---

const getBadgeStyles = (badge: string) => {
  switch (badge) {
    case 'Most Popular':
      return { text: '🔥 Most Popular', styles: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    case 'Recommended':
      return { text: '⭐ Recommended', styles: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    case 'Instant Start':
      return { text: '⚡ Instant Start', styles: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    case 'VIP':
      return { text: '👑 VIP Premium', styles: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
    case 'Premium':
      return { text: '💎 Premium Tier', styles: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    case 'Lifetime Refill':
      return { text: '🛡️ Lifetime Refill', styles: 'bg-green-500/10 text-green-400 border-green-500/20' };
    case 'High Retention':
      return { text: '📈 High Retention', styles: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    case 'Non Drop':
      return { text: '✅ Non Drop', styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    default:
      return { text: '⭐ Recommended', styles: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  }
};

const NewOrderPage = () => {
  const { user, showToast } = useApp();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>(Platform.FACEBOOK);
  const [catId, setCatId] = useState('');
  const [servId, setServId] = useState('');
  const [link, setLink] = useState('https://instagram.com/socialgrow/post');
  const [quantity, setQuantity] = useState(100);

  const categories = PLATFORM_CATEGORIES[platform];
  const activeCategory = categories.find(c => c.id === catId) || categories[0];
  const activeService = activeCategory.services.find(s => s.id === servId) || activeCategory.services[0];
  
  const totalPrice = Math.round((quantity * activeService.pricePer1000) / 1000);
  const canAfford = (user?.balance || 0) >= totalPrice;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!link || !link.startsWith('http')) {
      return showToast('Please enter a valid target link/URL (must start with http:// or https://)', 'error');
    }
    if (quantity < activeService.min) return showToast(`Minimum quantity is ${activeService.min}`, 'error');
    if (quantity > activeService.max) return showToast(`Maximum quantity is ${activeService.max}`, 'error');

    // Use current auth user UID or fall back to user.id
    const currentUid = auth.currentUser?.uid || user.id;
    const userRef = doc(db, 'users', currentUid);
    const orderId = generateID('ORD');

    const newOrder: Order = {
      id: orderId,
      userId: currentUid,
      platform,
      service: activeService.name,
      link,
      quantity,
      price: totalPrice,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString(),
      progress: 0,
      autoRefill: activeService.refillStatus !== 'None'
    };

    try {
      let remainingBalance = 0;

      // Execute atomic transaction for safe debit and order placement
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("User SMM account node not found in Firestore.");
        }
        const latestUserData = userSnap.data() as User;
        if (latestUserData.balance < totalPrice) {
          throw new Error(`Low balance. You need ₦${totalPrice.toLocaleString()} but only have ₦${latestUserData.balance.toLocaleString()}. Please fund your wallet.`);
        }

        remainingBalance = latestUserData.balance - totalPrice;

        // Perform balance deduction
        transaction.update(userRef, { balance: remainingBalance });

        // Place the SMM order
        const orderRef = doc(db, 'orders', orderId);
        transaction.set(orderRef, newOrder);
      });

      // Show clear success toast indicating successful submission and deduction
      showToast("Order submitted successfully! Price deducted.", 'success');

      // Navigate to congratulations success page
      navigate('/congratulations', { 
        state: { 
          order: newOrder,
          serviceName: activeService.name, 
          totalPrice, 
          newBalance: remainingBalance 
        } 
      });
    } catch (error: any) {
      console.error("Atomic transaction failed:", error);
      let errMsg = "Failed to submit SMM order. Please check balance and connection.";
      if (error instanceof Error) {
        errMsg = error.message;
      } else if (error && typeof error === 'object') {
        errMsg = error.message || JSON.stringify(error);
      }
      showToast(errMsg, 'error');
    }
  };

  const badgeInfo = getBadgeStyles(activeService.badge);
  const quantities = PLATFORM_QUANTITIES[platform];

  return (
    <div className="max-w-6xl mx-auto text-white animate-in slide-in-from-bottom-10 duration-500 pb-12">
      {/* Title Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-white uppercase">Configure SMM Boost</h2>
        <p className="text-xs text-gray-500 font-semibold mt-1">Deploy high-retention commercial-grade runs to your target URL in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Column 1 */}
        <div className="lg:col-span-7 bg-[#0D0F18] rounded-[45px] p-8 border border-white/5 shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          {/* Main Platforms Selector */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Select SMM Platform</span>
                <span className="text-[9px] text-purple-400 font-extrabold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/10">Active Pipeline</span>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {Object.values(Platform).map(p => {
                 const isSelected = platform === p;
                 return (
                   <button 
                     type="button"
                     key={p} 
                     onClick={() => {
                       setPlatform(p); 
                       const firstCat = PLATFORM_CATEGORIES[p][0];
                       setCatId(firstCat.id); 
                       setServId(firstCat.services[0].id);
                     }} 
                     className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                       isSelected 
                         ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.03]' 
                         : 'bg-[#121420] border-transparent text-gray-500 hover:bg-[#151928]'
                     }`}
                   >
                     {/* Glow Underlay on Selection */}
                     {isSelected && (
                       <span className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></span>
                     )}
                     <div className={`transition-transform duration-300 ${isSelected ? 'scale-110 text-purple-400' : 'text-gray-500'}`}>
                       {PLATFORM_LOGOS[p]}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest">{p}</span>
                   </button>
                 );
               })}
             </div>
          </div>

          <div className="space-y-6">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1 block">Traffic Category</label>
              <div className="relative">
                <select 
                  value={activeCategory.id} 
                  onChange={e => {
                    const foundCat = categories.find(c => c.id === e.target.value) || categories[0];
                    setCatId(foundCat.id); 
                    setServId(foundCat.services[0].id);
                  }} 
                  className="w-full bg-[#161924] border-none text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all cursor-pointer appearance-none text-white shadow-inner"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Package / Service Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1 block">Service Package</label>
              <div className="relative">
                <select 
                  value={activeService.id} 
                  onChange={e => setServId(e.target.value)} 
                  className="w-full bg-[#161924] border-none text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all cursor-pointer appearance-none text-white shadow-inner"
                >
                  {activeCategory.services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (₦{s.pricePer1000.toLocaleString()}/1K)</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Target Link input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">Target Link</label>
                <span className="text-[9px] text-purple-400 font-extrabold uppercase">HTTPS Link Target</span>
              </div>
              <div className="relative">
                <input 
                  required 
                  type="url" 
                  value={link} 
                  onChange={e => setLink(e.target.value)} 
                  placeholder="Paste target profile, group or post link" 
                  className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all text-white placeholder-gray-600 shadow-inner" 
                />
              </div>
            </div>

            {/* Quantity inputs & selectors */}
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block">Available Quantity presets</label>
                <span className="text-[9px] text-gray-500 font-extrabold uppercase">Min: {activeService.min.toLocaleString()} | Max: {activeService.max.toLocaleString()}</span>
              </div>
              
              {/* Quick Select Buttons Grid */}
              <div className="grid grid-cols-5 gap-2">
                {quantities.map(q => {
                  const isSelected = quantity === q;
                  const label = q >= 1000000 ? `${q/1000000}M` : q >= 1000 ? `${q/1000}K` : `${q}`;
                  return (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={`py-2 rounded-lg text-[10px] font-black transition-all border ${
                        isSelected 
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/10 scale-[1.05]' 
                          : 'bg-[#121420] text-gray-400 border-white/5 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Precise Quantity input */}
              <div className="relative mt-2">
                <input 
                  required 
                  type="number" 
                  min={activeService.min} 
                  max={activeService.max} 
                  value={quantity} 
                  onChange={e => setQuantity(Number(e.target.value))} 
                  className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all text-white shadow-inner" 
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                  Units Selection
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Panels: Column 2 */}
        <div className="lg:col-span-5 space-y-6">
          {/* PACKAGE INFORMATION PANEL */}
          <div className="bg-[#0D0F18]/95 rounded-[35px] p-6 border border-white/5 shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-black tracking-widest text-purple-400 uppercase mb-4 border-b border-white/5 pb-2">Execution Profile</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Service Quality</span>
                <span className="text-xs font-bold text-white">{activeService.serviceQuality}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Estimated Delivery</span>
                <span className="text-xs font-bold text-teal-400">{activeService.deliveryTime}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Refill Status</span>
                <span className="text-xs font-bold text-purple-450">{activeService.refillStatus}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Recommended Badge</span>
                <span className={`text-[10px] font-black border uppercase px-2.5 py-0.5 rounded-full ${badgeInfo.styles}`}>
                  {badgeInfo.text}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">Price per Quantity</span>
                <span className="text-xs font-black text-gray-300">₦{activeService.pricePer1000.toLocaleString()} / 1K</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-650/5 rounded-xl border border-purple-500/10 text-[11px] text-gray-400 leading-relaxed italic">
              "{activeService.description}"
            </div>
          </div>

          {/* DYNAMIC LIVE ORDER SUMMARY CARD */}
          <div className="bg-[#0D0F18]/95 rounded-[35px] p-6 border border-white/5 shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-black tracking-widest text-white uppercase mb-4 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-[9px] bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/10">Summary Card</span>
            </h3>

            <div className="bg-[#121420] rounded-2xl p-4 border border-white/5 space-y-3 font-mono text-[11px]">
              <div className="flex justify-between items-center text-gray-400">
                <span>PLATFORM:</span>
                <span className="text-white font-bold uppercase">{platform}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>CATEGORY:</span>
                <span className="text-white font-bold">{activeCategory.name}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>PACKAGE:</span>
                <span className="text-purple-400 font-bold max-w-[150px] truncate">{activeService.name}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 border-t border-white/5 pt-2 mt-2">
                <span>QUANTITY:</span>
                <span className="text-white font-bold">{quantity.toLocaleString()} units</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 border-b border-white/5 pb-2">
                <span>PRICE:</span>
                <span>₦{activeService.pricePer1000.toLocaleString()} / 1K</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-white pt-1">
                <span>TOTAL PRICE:</span>
                <span className="text-purple-400">₦{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="my-5 p-4 rounded-2xl bg-purple-600/10 border border-purple-500/20 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase">Current Balance</span>
                <span className="text-sm font-bold">₦{(user?.balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span className="text-[10px] font-black text-gray-500 uppercase">Expected Balance After Run</span>
                <span className="text-sm font-bold">
                  ₦{(Math.max(0, (user?.balance || 0) - totalPrice)).toLocaleString()}
                </span>
              </div>
              
              <div className="pt-2 border-t border-white/5 flex items-center justify-end">
                {!canAfford ? (
                  <span className="text-[9px] font-black text-red-500 uppercase bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">Insufficient SMM Balance</span>
                ) : (
                  <span className="text-[9px] font-black text-green-500 uppercase bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">Funds Cleared</span>
                )}
              </div>
            </div>

            <button 
              type="button"
              disabled={!canAfford}
              onClick={handleOrder} 
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all duration-300 ${
                canAfford 
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-purple-900/20 shadow-lg cursor-pointer' 
                  : 'bg-white/5 text-gray-600 border border-transparent cursor-not-allowed'
              }`}
            >
              Submit Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Admin Panel ---

const AdminHub = () => {
  const { users, orders, transactions } = useApp();
  const pendingTx = transactions.filter(t => t.status === 'pending');
  const systemValue = users.reduce((acc, u) => acc + u.balance, 0);

  // BACKEND CALCULATIONS: Dynamic Ledger Analytics calculations on the fly
  const approvedCapitalVolume = transactions
    .filter(t => t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const activeRunCostLiability = orders
    .filter(o => o.status === OrderStatus.PROCESSING || o.status === OrderStatus.PENDING)
    .reduce((acc, o) => acc + o.price, 0);

  const totalSuccessfulOrderCost = orders
    .filter(o => o.status !== OrderStatus.REFUNDED)
    .reduce((acc, o) => acc + o.price, 0);

  const projectedProfitMargin = Math.round(totalSuccessfulOrderCost * 0.35); // 35% margin markup calculation on active/completed runs
  const disbursedCommissions = users.reduce((acc, u) => acc + (u.referralEarnings || 0), 0);

  return (
    <div className="space-y-10 text-white animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
         <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">System Controller</h1>
            <p className="text-xs text-gray-500 font-semibold mt-1 font-sans">Verify system transactions, track active nodes, review financials, and process refunds</p>
         </div>
         <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full self-start sm:self-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-green-500">Nodes Synchronized</span>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl">
           <UsersIcon className="w-8 h-8 text-blue-500 mb-4" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Accounts</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">{users.length}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl">
           <AdjustmentsHorizontalIcon className="w-8 h-8 text-purple-500 mb-4" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Runs</p>
           <p className="text-4xl font-black mt-1 tracking-tighter">{orders.length}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl">
           <BanknotesIcon className="w-8 h-8 text-yellow-500 mb-4" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Audit</p>
           <p className="text-4xl font-black mt-1 tracking-tighter text-yellow-500">{pendingTx.length}</p>
        </div>
        <div className="bg-[#0D0F18] p-8 rounded-[35px] border border-white/5 shadow-2xl">
           <WalletIcon className="w-8 h-8 text-green-500 mb-4" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Liability</p>
           <p className="text-4xl font-black mt-1 tracking-tighter/90 leading-none">₦{systemValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Backend Ledger Calculations Card */}
      <div className="bg-[#0D0F18] p-6 md:p-10 rounded-[35px] md:rounded-[45px] border border-white/5 shadow-2xl">
         <div className="flex items-center gap-3 mb-6">
            <CommandLineIcon className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg md:text-xl font-black tracking-tight">Ledger Operations & Backend Calculations</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#161924] p-5 rounded-3xl border border-white/5">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-sans">Gross Capital Volume</span>
               <span className="text-xl font-black text-green-400 mt-1 block">₦{approvedCapitalVolume.toLocaleString()}</span>
               <p className="text-[9px] text-gray-500 mt-2 font-sans font-medium">Aggregated verified fiat deposits</p>
            </div>
            <div className="bg-[#161924] p-5 rounded-3xl border border-white/5">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-sans">Active Runs Overhead</span>
               <span className="text-xl font-black text-yellow-500 mt-1 block">₦{activeRunCostLiability.toLocaleString()}</span>
               <p className="text-[9px] text-gray-500 mt-2 font-sans font-medium">Total value of current ongoing orders</p>
            </div>
            <div className="bg-[#161924] p-5 rounded-3xl border border-white/5">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-sans">Projected Markup Profit</span>
               <span className="text-xl font-black text-purple-400 mt-1 block">₦{projectedProfitMargin.toLocaleString()}</span>
               <p className="text-[9px] text-gray-500 mt-2 font-sans font-medium">Estimated SMM margin (35% standard)</p>
            </div>
            <div className="bg-[#161924] p-5 rounded-3xl border border-white/5">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-sans">Referral Disbursements</span>
               <span className="text-xl font-black text-white mt-1 block">₦{disbursedCommissions.toLocaleString()}</span>
               <p className="text-[9px] text-gray-500 mt-2 font-sans font-medium">Paid out affiliate commissions</p>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
         <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl">
            <h3 className="text-xl font-black tracking-tight mb-8">Latest Registered Users</h3>
            <div className="space-y-4">
               {users.slice(-5).reverse().map(u => (
                  <div key={u.id} className="p-6 bg-[#161924] rounded-3xl flex items-center justify-between border border-white/5">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center font-black text-sm">{u.username.charAt(0)}</div>
                        <div>
                           <p className="text-sm font-black">{u.username}</p>
                           <p className="text-[8px] text-gray-500 font-bold uppercase">{u.email}</p>
                        </div>
                     </div>
                     <span className="text-xs font-black text-green-500">₦{u.balance.toLocaleString()}</span>
                  </div>
               ))}
            </div>
         </div>
         <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl">
            <h3 className="text-xl font-black tracking-tight mb-8">Verification Queue</h3>
            <div className="space-y-4">
               {pendingTx.map(t => (
                  <div key={t.id} className="p-6 bg-[#161924] rounded-3xl flex items-center justify-between border border-white/5">
                     <div>
                        <p className="text-lg font-black text-green-500">₦{t.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase">{t.username}</p>
                     </div>
                     <Link to="/admin/payments" className="px-5 py-2 bg-purple-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Inspect</Link>
                  </div>
               ))}
               {pendingTx.length === 0 && <p className="text-center py-10 opacity-20 font-black">All payments verified.</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const { users } = useApp();
  return (
    <div className="bg-[#0D0F18] p-6 md:p-10 rounded-[35px] md:rounded-[45px] border border-white/5 shadow-2xl text-white">
      <h2 className="text-2xl md:text-3xl font-black mb-10 tracking-tight font-sans">Account Database</h2>
      <div className="grid gap-4">
        {users.map(u => (
          <div key={u.id} className="p-6 md:p-8 bg-[#161924] rounded-3xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-purple-600/30">
             <div className="flex items-center gap-4 md:gap-6 min-w-0">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-black text-lg shrink-0">{u.username.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-black tracking-tight truncate">{u.username}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{u.email} • {u.role}</p>
                </div>
             </div>
             <div className="text-left sm:text-right shrink-0 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                <p className="text-xl md:text-2xl font-black text-green-500">₦{u.balance.toLocaleString()}</p>
                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1 font-mono">NODE: {u.id}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const { orders, users } = useApp();

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;

    try {
      // If setting to Cancel/Refund status, return funds to the user's balance
      if (newStatus === OrderStatus.REFUNDED) {
        const confirmCancel = window.confirm(`Are you sure you want to Cancel and Refund this run? ₦${order.price.toLocaleString()} will be automatically credited back to this user's balance.`);
        if (!confirmCancel) return;

        const userRef = doc(db, 'users', order.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const updatedBalance = userData.balance + order.price;
          await updateDoc(userRef, { balance: updatedBalance });
          alert(`Ledger Adjusted! Refunded ₦${order.price.toLocaleString()} back to ${userData.username}'s SMM wallet balance.`);
        } else {
          alert("Error: Target user node could not be resolved. Status will still transition but no balance was added.");
        }
      }

      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
      alert('SMM order state updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const updateProgress = async (id: string, progressVal: number) => {
    try {
      await updateDoc(doc(db, 'orders', id), { progress: progressVal });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-purple-400">System Run Management</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">Configure live SMM run steps, update status pipelines, check parameters, and issue refunds</p>
        </div>
        <div className="bg-[#0D0F18] px-5 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-gray-400">
          Global Queue Size: {orders.length}
        </div>
      </div>

      {orders.map(o => {
        const orderUser = users.find(u => u.id === o.userId);
        return (
          <div key={o.id} className="bg-[#0D0F18] p-10 rounded-[40px] border border-white/5 shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 border-b border-white/5 pb-6">
              <div className="space-y-4 flex-1 min-w-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-purple-500 p-3 bg-purple-500/5 border border-purple-500/10 rounded-2xl shrink-0">
                    {PLATFORM_LOGOS[o.platform]}
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight text-white">{o.service}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-wider leading-relaxed">
                      Reference Node ID: <code className="text-purple-400 font-mono">{o.id}</code>
                    </p>
                  </div>
                </div>

                <div className="bg-[#161924] p-5 rounded-2xl border border-white/5 space-y-3.5 mt-3 text-[11px] font-semibold text-gray-300">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-gray-500 font-bold uppercase text-[9px] shrink-0">Target Link:</span>
                    <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate max-w-sm font-mono flex items-center gap-1">
                      {o.link} 🔗
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-[9px]">Client Profile:</span>
                    <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg">
                      {orderUser ? `${orderUser.username} (${orderUser.email})` : `User ID: ${o.userId}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-[9px]">Requested Volume (Qty):</span>
                    <span className="text-purple-300 font-black text-xs bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                      {o.quantity.toLocaleString()} Items
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-[9px]">Registration Timestamp:</span>
                    <span className="text-gray-400">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end shrink-0 md:min-w-[160px]">
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Estimated Price</span>
                <p className="text-3xl font-black text-green-400 mt-1">₦{o.price.toLocaleString()}</p>
                <div className="mt-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                    o.status === OrderStatus.COMPLETED ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    o.status === OrderStatus.PENDING ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                    o.status === OrderStatus.PROCESSING ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    o.status === OrderStatus.REFUNDED ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  }`}>{o.status}</span>
                </div>
              </div>
            </div>

            {/* Slider to adjust the live progress of SMM run */}
            <div className="space-y-2 bg-[#161924]/45 p-5 rounded-3xl border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Configure Live Progress</span>
                <span className="text-xs font-black text-purple-400">{o.progress || 0}% Complete</span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={o.progress || 0} 
                  onChange={(e) => updateProgress(o.id, Number(e.target.value))}
                  className="flex-1 accent-purple-500 h-2 bg-[#161924] rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Action State Buttons including Refund/Cancel */}
            <div className="space-y-3 pt-2">
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Adjust Run Life cycle Stage:</p>
              <div className="flex flex-wrap gap-2.5">
                {[OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.COMPLETED, OrderStatus.REFUNDED].map(s => {
                  let badgeLabel = s as string;
                  if (s === OrderStatus.REFUNDED) badgeLabel = "Refund & Cancel ❌";
                  if (s === OrderStatus.PROCESSING) badgeLabel = "Progressing ⚡";
                  if (s === OrderStatus.COMPLETED) badgeLabel = "Completed ✅";
                  if (s === OrderStatus.PENDING) badgeLabel = "Pending ⏳";

                  return (
                    <button 
                      key={s} 
                      onClick={() => updateStatus(o, s)} 
                      className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${
                        o.status === s 
                          ? 'bg-purple-600 text-white shadow-lg border border-purple-500' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {badgeLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      {orders.length === 0 && <p className="text-center py-20 opacity-20 font-black italic text-lg">No active system runs logged.</p>}
    </div>
  );
};

const AdminPendingOrders = () => {
  const { orders, users, showToast } = useApp();

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;

    try {
      if (newStatus === OrderStatus.REFUNDED) {
        const confirmCancel = window.confirm(`Are you sure you want to Cancel and Refund this run? ₦${order.price.toLocaleString()} will be automatically credited back to this user's balance.`);
        if (!confirmCancel) return;

        const userRef = doc(db, 'users', order.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const updatedBalance = userData.balance + order.price;
          await updateDoc(userRef, { balance: updatedBalance });
          showToast(`Refunded ₦${order.price.toLocaleString()} back to ${userData.username}'s SMM wallet.`, 'success');
        } else {
          showToast("Error: Target user node could not be resolved.", 'error');
        }
      }

      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
      showToast(`Order status updated to ${newStatus}.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      showToast("Failed to update status", "error");
    }
  };

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-yellow-400">Receive Submitted Orders</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1 font-sans">Acknowledge, claim, start runs, or refund pending user submissions</p>
        </div>
        <div className="bg-[#0D0F18] px-5 py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase text-yellow-400">
          Pending Queue Size: {pendingOrders.length}
        </div>
      </div>

      <div className="space-y-6">
        {pendingOrders.map(o => {
          const orderUser = users.find(u => u.id === o.userId);
          return (
            <div key={o.id} className="bg-[#0D0F18] p-6 md:p-10 rounded-[35px] md:rounded-[40px] border border-white/5 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 border-b border-white/5 pb-6">
                <div className="space-y-4 flex-1 min-w-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-yellow-500 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl shrink-0">
                      {PLATFORM_LOGOS[o.platform]}
                    </div>
                    <div>
                      <h4 className="text-lg font-black tracking-tight text-white">{o.service}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-wider leading-relaxed leading-sans">
                        Reference Node ID: <code className="text-yellow-400 font-mono">{o.id}</code>
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#161924] p-5 rounded-2xl border border-white/5 space-y-3.5 mt-3 text-[11px] font-semibold text-gray-300">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-500 font-bold uppercase text-[9px] shrink-0">Target Link:</span>
                      <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate max-w-sm font-mono flex items-center gap-1">
                        {o.link} 🔗
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold uppercase text-[9px]">Client Profile:</span>
                      <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg">
                        {orderUser ? `${orderUser.username} (${orderUser.email})` : `User ID: ${o.userId}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold uppercase text-[9px]">Requested Volume (Qty):</span>
                      <span className="text-yellow-400 font-black text-xs bg-yellow-500/10 px-2.5 py-0.5 rounded-lg border border-yellow-500/20 font-sans">
                        {o.quantity.toLocaleString()} Items
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-sans">
                      <span className="text-gray-500 font-bold uppercase text-[9px]">Registration Timestamp:</span>
                      <span className="text-gray-400">{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end shrink-0 md:min-w-[160px] font-sans">
                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Estimated Price</span>
                  <p className="text-3xl font-black text-green-400 mt-1">₦{o.price.toLocaleString()}</p>
                </div>
              </div>

              {/* Receive Commands */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => updateStatus(o, OrderStatus.PROCESSING)}
                  className="flex-1 cursor-pointer py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/20"
                >
                  ⚡ Receive & Start Run
                </button>
                <button
                  onClick={() => updateStatus(o, OrderStatus.COMPLETED)}
                  className="flex-1 cursor-pointer py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/15"
                >
                  ✅ Fast-Complete Run
                </button>
                <button
                  onClick={() => updateStatus(o, OrderStatus.REFUNDED)}
                  className="flex-1 cursor-pointer py-4 bg-red-600/15 hover:bg-red-600/25 text-red-500 rounded-2xl border border-red-500/10 font-black text-xs uppercase tracking-widest transition-all"
                >
                  ❌ Cancel & Refund
                </button>
              </div>
            </div>
          );
        })}
        {pendingOrders.length === 0 && (
          <div className="text-center py-24 bg-[#0D0F18]/50 rounded-[40px] border border-dashed border-white/5 shadow-inner">
            <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-pulse" />
            <p className="font-sans font-black text-lg text-gray-500 italic block">Pending Queue is Empty</p>
            <p className="text-xs text-gray-600 mt-1 uppercase tracking-wider font-extrabold font-sans">All orders are received & processing.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPayments = () => {
  const { transactions, users, showToast } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const approve = async (tx: Transaction) => {
    try {
      const userRef = doc(db, 'users', tx.userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      const userData = userDoc.data() as User;

      // 1. Approve Transaction
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'approved' });
      
      // 2. Credit the User
      await updateDoc(userRef, { balance: userData.balance + tx.amount });

      // 3. BACKEND REFERRAL CALCULATION: Credit 10% commission if user was referred by another node
      if (userData.referredBy) {
        try {
          const usersRef = collection(db, 'users');
          const refQuery = query(usersRef, where('referralCode', '==', userData.referredBy));
          const querySnap = await getDocs(refQuery);
          if (!querySnap.empty) {
            const referrerDoc = querySnap.docs[0];
            const referrerRef = referrerDoc.ref;
            const referrerData = referrerDoc.data() as User;
            const commission = Math.round(tx.amount * 0.10); // 10% Backend calculation
            if (commission > 0) {
              await updateDoc(referrerRef, { 
                balance: referrerData.balance + commission,
                referralEarnings: (referrerData.referralEarnings || 0) + commission
              });
              showToast(`Referral Commission of ₦${commission.toLocaleString()} credited to ${referrerData.username}!`, 'success');
            }
          }
        } catch (err) {
          console.error("Backend referral calculation error:", err);
        }
      }

      showToast('Agent SMM wallet credited successfully.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions/users');
      showToast('Error verifying payment.', 'error');
    }
  };

  const reject = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      showToast('Deposit rejected.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.id}`);
      showToast('Error rejecting payment.', 'error');
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const pastTransactions = transactions.filter(t => t.status !== 'pending');

  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl text-white space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Payment Verification Gateway</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">Audit capital injections, inspect attachment documents, and view past balance logs</p>
        </div>
        
        {/* Toggle tabs for queue vs ledger */}
        <div className="flex p-1.5 bg-[#161924] rounded-2xl border border-white/5 self-start md:self-auto">
          <button 
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'pending' ? 'bg-[#800080] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Pending Audits <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md text-[9px] font-bold">{pendingTransactions.length}</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-[#800080] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Ledger History <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md text-[9px] font-bold">{pastTransactions.length}</span>
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid gap-6">
          {pendingTransactions.map(t => {
            const txUser = users.find(u => u.id === t.userId);
            return (
            <div key={t.id} className="p-10 bg-[#161924] rounded-[40px] flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/5 transition-all hover:border-purple-500/20 shadow-xl">
               <div className="flex-1 space-y-4">
                 <div>
                   <p className="text-4xl font-black text-green-500">₦{t.amount.toLocaleString()}</p>
                   <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest">{t.username} • REF: {t.id} {txUser ? `(${txUser.email})` : ''}</p>
                 </div>
                 {t.receipt && (
                   <button type="button" onClick={() => setSelectedReceipt(t.receipt || null)} className="flex items-center gap-2 text-[10px] font-black text-purple-300 uppercase tracking-widest bg-purple-500/10 px-4 py-2.5 rounded-xl border border-purple-500/20 hover:bg-[#800080]/20 hover:text-white transition-all">
                     <EyeIcon className="w-4 h-4" /> Inspect Receipt
                   </button>
                 )}
               </div>
               <div className="flex gap-4">
                  <button type="button" onClick={() => reject(t)} className="px-8 py-4 bg-red-600/10 text-red-500 rounded-2xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-600 hover:text-white transition-all">Reject</button>
                  <button type="button" onClick={() => approve(t)} className="px-10 py-4 bg-green-600 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all">Approve & Credit</button>
               </div>
            </div>
          );
        })}
          {pendingTransactions.length === 0 && <p className="text-center py-20 opacity-20 font-black italic">No pending audits.</p>}
        </div>
      ) : (
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {pastTransactions.map(t => {
            const txUser = users.find(u => u.id === t.userId);
            return (
              <div key={t.id} className="p-8 bg-[#161924] border border-white/5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-white/10 transition-all text-white">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-black text-white">₦{t.amount.toLocaleString()}</p>
                    <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase border ${
                      t.status === 'approved' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                    User: <strong className="text-gray-300">{t.username}</strong> {txUser ? `(${txUser.email})` : ''} 
                    <span className="text-purple-400 font-mono block mt-1">Ref Node: {t.id}</span>
                  </div>
                  <p className="text-[9px] font-semibold text-gray-400">Timestamp: {new Date(t.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3">
                  {t.receipt && (
                    <button type="button" onClick={() => setSelectedReceipt(t.receipt || null)} className="flex items-center gap-2 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                      <EyeIcon className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {pastTransactions.length === 0 && (
            <p className="text-center py-20 opacity-20 font-black italic text-lg">No historical transaction logs found.</p>
          )}
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-black/95 backdrop-blur-md" onClick={() => setSelectedReceipt(null)}>
           <div className="relative max-w-4xl w-full bg-[#0D0F18] p-4 rounded-[40px] border border-white/10" onClick={e => e.stopPropagation()}>
              <img src={selectedReceipt} alt="Receipt Inspector" className="w-full h-auto max-h-[80vh] object-contain rounded-[30px] shadow-2xl mx-auto" />
           </div>
        </div>
      )}
    </div>
  );
};

// --- App Entry ---

const WalletPage = () => {
  const { user, transactions, showToast } = useApp();
  const [amt, setAmt] = useState(1000);
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accNo = "9067892034";

  const pendingTx = transactions.find(t => t.userId === user?.id && t.status === 'pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReceipt(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const notify = async () => {
    if (!user) return;
    if (amt < 500) return showToast("Minimum deposit is ₦500", 'error');
    if (!receipt) return showToast("Please upload a screenshot of the successful transfer.", 'error');
    
    try {
      const txId = generateID('TX');
      const tx: Transaction = { 
        id: txId, 
        userId: user.id, 
        username: user.username, 
        amount: amt, 
        status: 'pending', 
        createdAt: new Date().toISOString(),
        receipt: receipt
      };
      await setDoc(doc(db, 'transactions', txId), tx);
      setReceipt(null);
      showToast("Payment submitted to admin verification queue.", 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };


  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10 text-white animate-in fade-in duration-500">
       <div className="lg:col-span-3 space-y-8">
          <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl">
            <h2 className="text-3xl font-black mb-10 tracking-tight">Injection Center</h2>
            <div className="bg-purple-600 p-10 rounded-[40px] shadow-2xl shadow-purple-900/20 mb-10 relative overflow-hidden group">
               <p className="text-[10px] font-black uppercase opacity-60 mb-6 tracking-widest text-center">Transfer to OPay Terminal</p>
               <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-4xl font-black tracking-tight">{accNo}</p>
                    <button onClick={() => {navigator.clipboard.writeText(accNo); showToast('Terminal Address Copied!', 'success')}} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><ClipboardIcon className="w-6 h-6" /></button>
                  </div>
                  <p className="text-base font-bold uppercase tracking-widest opacity-80">John Gideon Ifebuche</p>
               </div>
            </div>
            {pendingTx ? (
              <div className="bg-yellow-500/10 border-2 border-yellow-500/20 p-10 rounded-[35px] text-center space-y-4 animate-pulse">
                <InformationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-black text-yellow-500 uppercase tracking-tight">Audit in Progress</h3>
                <p className="text-gray-400 text-sm font-medium">The system is currently verifying your deposit of ₦{pendingTx.amount.toLocaleString()}.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-600 uppercase ml-2 tracking-widest">Amount Dispatched (₦)</label>
                  <input type="number" min="500" value={amt} onChange={e => setAmt(Number(e.target.value))} className="w-full bg-[#161924] rounded-[25px] px-8 py-5 text-2xl font-black outline-none border border-white/5 focus:ring-4 focus:ring-purple-600/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-600 uppercase ml-2 tracking-widest">Proof of Transfer</label>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full h-44 bg-[#161924] rounded-[30px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-purple-600/50 transition-all overflow-hidden">
                    {receipt ? <img src={receipt} alt="Preview" className="w-full h-full object-cover opacity-60" /> : <><ArrowUpTrayIcon className="w-8 h-8 text-gray-700 mb-4" /><p className="text-xs font-black text-gray-500 uppercase tracking-widest">Attach Screenshot</p></>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                <button onClick={notify} className="w-full py-6 bg-purple-600 rounded-[25px] font-black text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-900/20">Notify Master Admin</button>
              </div>
            )}
          </div>
       </div>
       <div className="lg:col-span-2 space-y-6">
         <h3 className="text-xl font-black flex items-center gap-3 text-purple-500 ml-2"><ClockIcon className="w-6 h-6" /> Capital Log</h3>
         <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
           {transactions.filter(t => t.userId === user?.id).reverse().map(t => (
             <div key={t.id} className="p-6 bg-[#0D0F18] border border-white/5 rounded-3xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                   <div>
                      <p className="text-xl font-black text-green-500">₦{t.amount.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                   </div>
                   <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase border ${t.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : t.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{t.status}</span>
                </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

const OrderHistory = () => {
  const { orders, user } = useApp();
  const [activeFilter, setActiveFilter] = React.useState<'All' | OrderStatus.PENDING | OrderStatus.PROCESSING | OrderStatus.COMPLETED>('All');

  const userOrders = orders.filter(o => o.userId === user?.id);
  const filteredOrders = userOrders.filter(o => {
    if (activeFilter === 'All') return true;
    return o.status === activeFilter;
  });

  const filterOptions = [
    { label: 'All Runs', value: 'All' },
    { label: 'Pending', value: OrderStatus.PENDING },
    { label: 'Processing', value: OrderStatus.PROCESSING },
    { label: 'Completed', value: OrderStatus.COMPLETED },
  ];

  return (
    <div className="bg-[#0D0F18] p-6 md:p-10 rounded-[35px] md:rounded-[45px] border border-white/5 text-white shadow-2xl animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Run History</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1 font-sans">Track the progression and status of all social runs</p>
        </div>
        
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#161924] rounded-2xl border border-white/5">
          {filterOptions.map((opt) => {
            const isSelected = activeFilter === opt.value;
            const count = opt.value === 'All' 
              ? userOrders.length 
              : userOrders.filter(o => o.status === opt.value).length;

            return (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value as any)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  isSelected 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.map(o => (
          <div key={o.id} className="p-6 md:p-8 bg-[#161924] rounded-3xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-purple-600/30 transition-all">
            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
              <div className="text-purple-500 shrink-0">{PLATFORM_LOGOS[o.platform]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-base md:text-lg font-black tracking-tight truncate">{o.service}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 truncate max-w-xs md:max-w-md font-mono">{o.link}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
              <div className="text-left sm:text-right">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Volume</p>
                <p className="text-sm font-black text-white">{o.quantity.toLocaleString()} items</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                o.status === OrderStatus.COMPLETED ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                o.status === OrderStatus.PENDING ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                o.status === OrderStatus.PROCESSING ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                'bg-gray-500/10 text-gray-400 border-gray-500/20'
              }`}>{o.status}</span>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="text-center py-20 bg-[#161924]/30 rounded-3xl border border-dashed border-white/5">
            <p className="opacity-40 text-sm font-black italic">No records found matching status "{activeFilter}".</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AffiliatePage = () => {
  const { user, showToast } = useApp();
  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 text-white shadow-2xl animate-in fade-in duration-700">
      <h2 className="text-3xl font-black tracking-tight mb-8">Affiliate Terminal</h2>
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
         <div className="bg-[#161924] p-8 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Commission Earnings</p>
            <p className="text-3xl font-black text-green-500 mt-2">₦{(user?.referralEarnings || 0).toLocaleString()}</p>
         </div>
         <div className="bg-[#161924] p-8 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Network Tier</p>
            <p className="text-3xl font-black text-purple-500 mt-2">Premium</p>
         </div>
         <div className="bg-[#161924] p-8 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ref Shares</p>
            <p className="text-3xl font-black text-blue-500 mt-2">20%</p>
         </div>
      </div>
      <div className="bg-purple-600/5 p-10 rounded-[35px] border border-purple-500/10">
         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Unique Invite Node</p>
         <div className="bg-[#0D0F18] p-6 rounded-2xl flex items-center justify-between gap-4">
            <code className="text-xs text-purple-500 font-mono select-all truncate">tomsociagrow.com/ref/{user?.referralCode}</code>
            <button onClick={() => {navigator.clipboard.writeText(`tomsociagrow.com/ref/${user?.referralCode}`); showToast('Link Copied!', 'success')}} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><ClipboardIcon className="w-5 h-5" /></button>
         </div>
      </div>
    </div>
  );
};

const SupportPage = () => {
  const { showToast } = useApp();
  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 text-white shadow-2xl">
      <h2 className="text-3xl font-black tracking-tight mb-10">Communications Hub</h2>
      <div className="bg-[#161924] p-10 rounded-[40px] border border-white/5 space-y-6">
         <p className="text-sm text-gray-500 font-medium">Explain your query below. Response time is typically 5-30 minutes.</p>
         <input type="text" placeholder="Subject / Order ID" className="w-full bg-[#0D0F18] border border-white/5 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-purple-600" />
         <textarea placeholder="Detailed Description..." className="w-full bg-[#0D0F18] border border-white/5 rounded-3xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-purple-600 h-40" />
         <button onClick={() => showToast('Encrypted message sent to admin.', 'success')} className="w-full py-5 bg-purple-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Transmit Ticket</button>
      </div>
    </div>
  );
};

const CongratulationsPage = () => {
  const location = useLocation();
  const { order, serviceName, totalPrice, newBalance } = location.state || {};

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center text-white max-w-xl mx-auto">
      <div className="w-24 h-24 bg-green-500/10 border-2 border-green-500/30 rounded-[35px] flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(34,197,94,0.15)] animate-pulse">
        <CheckIcon className="w-12 h-12 text-green-500" />
      </div>
      
      <h2 className="text-3xl font-black tracking-tight text-white uppercase">SMM Order Deployed!</h2>
      <p className="text-gray-400 max-w-md mt-2 mb-8 text-xs font-semibold leading-relaxed">Your order is now in progress and running safely in our premier high-priority execution servers.</p>

      {/* Reciept Widget */}
      {order && (
        <div className="w-full bg-[#0D0F18] border border-white/5 rounded-[30px] p-6 mb-8 text-left space-y-4 shadow-xl">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Order Reference</span>
            <span className="font-mono text-purple-400 font-extrabold">{order.id}</span>
          </div>
          <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Platform Base</span>
            <span className="text-white font-extrabold">{order.platform}</span>
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Deployed Service</span>
            <p className="text-xs text-purple-300 font-black leading-tight">{order.service}</p>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Target Link</span>
            <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline hover:text-purple-400 font-mono truncate block">
              {order.link}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-2 mt-2">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Volume Deployed</span>
              <span className="text-xs font-black text-white">{order.quantity.toLocaleString()} units</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Deducted Wallet Amount</span>
              <span className="text-xs font-black text-purple-400">₦{order.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 w-full">
        <Link to="/orders" className="flex-1 text-center py-4 bg-purple-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/10 hover:brightness-105 active:scale-95 transition-transform">
          Audit Run Status
        </Link>
        <Link to="/new-order" className="flex-1 text-center py-4 bg-[#121420] border border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/5 active:scale-95 transition-transform text-gray-300">
          Place Another Order
        </Link>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ref/:refCode" element={<ReferralRedirect />} />
          <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
          <Route path="/analytics" element={<PrivateLayout><AnalyticsPage /></PrivateLayout>} />
          <Route path="/new-order" element={<PrivateLayout><NewOrderPage /></PrivateLayout>} />
          <Route path="/orders" element={<PrivateLayout><OrderHistory /></PrivateLayout>} />
          <Route path="/wallet" element={<PrivateLayout><WalletPage /></PrivateLayout>} />
          <Route path="/affiliate" element={<PrivateLayout><AffiliatePage /></PrivateLayout>} />
          <Route path="/support" element={<PrivateLayout><SupportPage /></PrivateLayout>} />
          <Route path="/congratulations" element={<PrivateLayout><CongratulationsPage /></PrivateLayout>} />
          <Route path="/admin/*" element={<PrivateLayout><Routes>
            <Route index element={<AdminHub />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="pending" element={<AdminPendingOrders />} />
            <Route path="payments" element={<AdminPayments />} />
          </Routes></PrivateLayout>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

