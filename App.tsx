import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Order, OrderStatus, Platform, Transaction, Ticket 
} from './types';
import { PLATFORM_LOGOS, PLATFORM_CATEGORIES } from './constants';
import { 
  HomeIcon, ShoppingCartIcon, ClockIcon, WalletIcon, 
  ChatBubbleLeftRightIcon, 
  ArrowRightOnRectangleIcon, Bars3Icon, SunIcon, MoonIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon, UsersIcon, CheckIcon, QuestionMarkCircleIcon,
  ClipboardIcon, CodeBracketIcon, SparklesIcon, ShareIcon,
  CommandLineIcon, PencilSquareIcon, ClipboardDocumentCheckIcon,
  ArrowUpTrayIcon, EyeIcon, InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// --- Firebase Imports ---
import { auth, db, signInWithGoogle } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, 
  updateDoc, addDoc, getDocFromServer, serverTimestamp 
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
      authLoading
    }}>
      {children}
    </AppContext.Provider>
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
        const newUser: User = {
          id: result.user.uid,
          username: formData.email.split('@')[0],
          email: formData.email,
          role: formData.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() ? 'admin' : 'user',
          balance: 0,
          apiKey: generateID('KEY'),
          referralCode: generateID('REF'),
          referralEarnings: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', result.user.uid), newUser);
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
        const newUser: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: firebaseUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() ? 'admin' : 'user',
          balance: 0,
          apiKey: generateID('KEY'),
          referralCode: generateID('REF'),
          referralEarnings: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newUser);
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
            {authError && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{authError}</p>}
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
    <header className="sticky top-0 z-30 w-full h-24 bg-[#05060A]/80 backdrop-blur-md border-b border-white/5 px-8 lg:px-14 flex items-center justify-between text-white">
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
    { name: 'Global Orders', path: '/admin/orders', icon: AdjustmentsHorizontalIcon },
    { name: 'Transactions', path: '/admin/payments', icon: BanknotesIcon },
  ] : [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
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
        <main className="flex-1 p-8 lg:p-14 overflow-y-auto">
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

const NewOrderPage = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>(Platform.FACEBOOK);
  const [catId, setCatId] = useState('');
  const [servId, setServId] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState(100);

  const categories = PLATFORM_CATEGORIES[platform];
  const activeCategory = categories.find(c => c.id === catId) || categories[0];
  const activeService = activeCategory.services.find(s => s.id === servId) || activeCategory.services[0];
  
  const totalPrice = Math.round((quantity * activeService.pricePer1000) / 1000);
  const canAfford = (user?.balance || 0) >= totalPrice;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (quantity < activeService.min) return alert(`Minimum is ${activeService.min}`);
    if (!canAfford) return alert("Low balance. Please fund your wallet.");

    try {
      const orderId = generateID('ORD');
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        platform,
        service: activeService.name,
        link,
        quantity,
        price: totalPrice,
        status: OrderStatus.PENDING,
        createdAt: new Date().toISOString(),
        progress: 0,
        autoRefill: activeService.hasRefill || false
      };

      await updateDoc(doc(db, 'users', user.id), {
        balance: user.balance - totalPrice
      });
      await setDoc(doc(db, 'orders', orderId), newOrder);
      navigate('/congratulations', { state: { service: activeService.name } });
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'orders/users');
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-8 text-white animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-[#0D0F18] rounded-[45px] p-10 border border-white/5 shadow-2xl">
        <h2 className="text-3xl font-black tracking-tight mb-10">Configure Boost</h2>
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.values(Platform).map(p => (
              <button key={p} onClick={() => {setPlatform(p); setCatId(''); setServId('');}} className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all ${platform === p ? 'bg-purple-600 border-purple-500 scale-105' : 'bg-[#161924] border-transparent text-gray-600'}`}>
                {PLATFORM_LOGOS[p]}
                <span className="text-[8px] font-black uppercase tracking-widest">{p}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Category</p>
              <select value={catId} onChange={e => {setCatId(e.target.value); setServId('');}} className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Package</p>
              <select value={servId} onChange={e => setServId(e.target.value)} className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-600">
                {activeCategory.services.map(s => <option key={s.id} value={s.id}>{s.name} (₦{s.pricePer1000}/1k)</option>)}
              </select>
            </div>
            <div className="p-4 bg-purple-600/5 rounded-2xl border border-purple-500/10 text-xs text-gray-400 leading-relaxed italic">
               "{activeService.description}"
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Target Link</p>
              <input required type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Quantity (Min: {activeService.min})</p>
              <input required type="number" min={activeService.min} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-[#161924] border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
            </div>
          </div>

          <div className="bg-purple-600/10 p-6 rounded-3xl border border-purple-500/20 flex justify-between items-center">
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-500 uppercase">Estimated Total</p>
                <p className="text-3xl font-black">₦{totalPrice.toLocaleString()}</p>
             </div>
             {!canAfford && <span className="text-[8px] font-black text-red-500 uppercase bg-red-500/10 px-3 py-1 rounded-full">Insufficient Fund</span>}
          </div>

          <button onClick={handleOrder} className="w-full py-5 bg-purple-600 rounded-2xl font-black text-lg shadow-xl shadow-purple-900/20 hover:bg-purple-700 transition-all">Submit Order</button>
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

  return (
    <div className="space-y-10 text-white animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
         <h1 className="text-4xl font-black tracking-tight">System Controller</h1>
         <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-green-500">Nodes Synchronized</span>
         </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
           <p className="text-4xl font-black mt-1 tracking-tighter">₦{systemValue.toLocaleString()}</p>
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
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl text-white">
      <h2 className="text-3xl font-black mb-10 tracking-tight">Account Database</h2>
      <div className="grid gap-4">
        {users.map(u => (
          <div key={u.id} className="p-8 bg-[#161924] rounded-3xl border border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-black text-lg">{u.username.charAt(0)}</div>
                <div>
                  <p className="text-xl font-black tracking-tight">{u.username}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{u.email} • {u.role}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-2xl font-black text-green-500">₦{u.balance.toLocaleString()}</p>
                <p className="text-[9px] text-gray-600 font-black uppercase mt-1">ID: {u.id}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const { orders } = useApp();
  const updateStatus = async (id: string, s: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: s });
      alert('System status updated.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <h2 className="text-3xl font-black tracking-tight mb-8">System Run Management</h2>
      {orders.map(o => (
        <div key={o.id} className="bg-[#0D0F18] p-10 rounded-[40px] border border-white/5 shadow-2xl space-y-6">
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-5">
                <div className="text-purple-500">{PLATFORM_LOGOS[o.platform]}</div>
                <div>
                  <h4 className="text-lg font-black tracking-tight">{o.service}</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Target: {o.link}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-2xl font-black text-purple-500">₦{o.price.toLocaleString()}</p>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{o.status}</span>
             </div>
           </div>
           <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
              {[OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.COMPLETED, OrderStatus.REFUNDED].map(s => (
                <button key={s} onClick={() => updateStatus(o.id, s)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${o.status === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-600 hover:text-white'}`}>{s}</button>
              ))}
           </div>
        </div>
      ))}
      {orders.length === 0 && <p className="text-center py-20 opacity-20 font-black italic">No active system runs logged.</p>}
    </div>
  );
};

const AdminPayments = () => {
  const { transactions } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const approve = async (tx: Transaction) => {
    try {
      // Find user to get current balance
      const userDoc = await getDoc(doc(db, 'users', tx.userId));
      if (!userDoc.exists()) throw new Error("User not found");
      const userData = userDoc.data() as User;

      await updateDoc(doc(db, 'transactions', tx.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', tx.userId), { balance: userData.balance + tx.amount });
      alert('Agent wallet credited successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions/users');
    }
  };

  const reject = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      alert('Deposit rejected.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };


  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 shadow-2xl text-white space-y-10">
       <h2 className="text-3xl font-black tracking-tight">Payment Verification Gateway</h2>
       <div className="grid gap-6">
         {transactions.filter(t => t.status === 'pending').map(t => (
           <div key={t.id} className="p-10 bg-[#161924] rounded-[40px] flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/5">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-4xl font-black text-green-500">₦{t.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest">{t.username} • REF: {t.id}</p>
                </div>
                {t.receipt && <button onClick={() => setSelectedReceipt(t.receipt || null)} className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all"><EyeIcon className="w-4 h-4" /> Inspect Receipt</button>}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => reject(t)} className="px-8 py-4 bg-red-600/10 text-red-500 rounded-2xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-600 hover:text-white transition-all">Reject</button>
                 <button onClick={() => approve(t)} className="px-10 py-4 bg-green-600 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all">Approve & Credit</button>
              </div>
           </div>
         ))}
         {transactions.filter(t => t.status === 'pending').length === 0 && <p className="text-center py-20 opacity-20 font-black italic">No pending audits.</p>}
       </div>
       {selectedReceipt && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-black/95 backdrop-blur-md" onClick={() => setSelectedReceipt(null)}>
            <div className="relative max-w-4xl w-full bg-[#0D0F18] p-4 rounded-[40px] border border-white/10" onClick={e => e.stopPropagation()}>
               <img src={selectedReceipt} alt="Receipt Inspector" className="w-full h-auto rounded-[30px] shadow-2xl" />
            </div>
         </div>
       )}
    </div>
  );
};

// --- App Entry ---

const WalletPage = () => {
  const { user, transactions } = useApp();
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
    if (amt < 500) return alert("Minimum deposit is ₦500");
    if (!receipt) return alert("Please upload a screenshot of the successful transfer.");
    
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
      alert("Payment submitted to admin verification queue.");
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
                    <button onClick={() => {navigator.clipboard.writeText(accNo); alert('Terminal Address Copied!')}} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><ClipboardIcon className="w-6 h-6" /></button>
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
  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 text-white shadow-2xl animate-in fade-in duration-700">
      <h2 className="text-3xl font-black tracking-tight mb-10">Run History</h2>
      <div className="space-y-4">
        {orders.filter(o => o.userId === user?.id).map(o => (
          <div key={o.id} className="p-8 bg-[#161924] rounded-3xl border border-white/5 flex justify-between items-center group hover:border-purple-600/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="text-purple-500">{PLATFORM_LOGOS[o.platform]}</div>
              <div>
                <p className="text-lg font-black tracking-tight">{o.service}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 truncate max-w-xs">{o.link}</p>
              </div>
            </div>
            <span className="bg-purple-600/10 text-purple-500 px-5 py-2 rounded-full text-[9px] font-black uppercase border border-purple-500/20">{o.status}</span>
          </div>
        ))}
        {orders.filter(o => o.userId === user?.id).length === 0 && <p className="text-center py-20 opacity-20 font-black italic">No historical runs recorded.</p>}
      </div>
    </div>
  );
};

const AffiliatePage = () => {
  const { user } = useApp();
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
            <button onClick={() => {navigator.clipboard.writeText(`tomsociagrow.com/ref/${user?.referralCode}`); alert('Link Copied!')}} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><ClipboardIcon className="w-5 h-5" /></button>
         </div>
      </div>
    </div>
  );
};

const SupportPage = () => {
  return (
    <div className="bg-[#0D0F18] p-10 rounded-[45px] border border-white/5 text-white shadow-2xl">
      <h2 className="text-3xl font-black tracking-tight mb-10">Communications Hub</h2>
      <div className="bg-[#161924] p-10 rounded-[40px] border border-white/5 space-y-6">
         <p className="text-sm text-gray-500 font-medium">Explain your query below. Response time is typically 5-30 minutes.</p>
         <input type="text" placeholder="Subject / Order ID" className="w-full bg-[#0D0F18] border border-white/5 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-purple-600" />
         <textarea placeholder="Detailed Description..." className="w-full bg-[#0D0F18] border border-white/5 rounded-3xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-purple-600 h-40" />
         <button onClick={() => alert('Encrypted message sent to admin.')} className="w-full py-5 bg-purple-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Transmit Ticket</button>
      </div>
    </div>
  );
};

const CongratulationsPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-24 h-24 bg-green-500/10 rounded-[35px] flex items-center justify-center mb-8 border border-green-500/20 shadow-2xl animate-bounce"><CheckIcon className="w-12 h-12 text-green-500" /></div>
      <h2 className="text-5xl font-black tracking-tighter mb-4">Run Initialized!</h2>
      <p className="text-gray-400 max-w-sm mb-12 font-medium">Your global boost is now processing in our priority engine. Expect progress updates within minutes.</p>
      <Link to="/orders" className="bg-purple-600 px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-900/20 hover:scale-105 transition-transform">Audit Status</Link>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
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
            <Route path="payments" element={<AdminPayments />} />
          </Routes></PrivateLayout>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

