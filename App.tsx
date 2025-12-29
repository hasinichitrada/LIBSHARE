
import React, { useState, useMemo } from 'react';
import { 
  Book as BookIcon, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  LogOut, 
  Search,
  BookOpen,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { User, Book, BorrowRequest, Issue, Notification, Role } from './types';
import { INITIAL_BOOKS, INITIAL_USERS, FINE_PER_DAY, BORROW_DAYS } from './constants';

const App: React.FC = () => {
  // Login State
  const [loginStep, setLoginStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Persistence (Simulated DB)
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [view, setView] = useState<'catalog' | 'requests' | 'mybooks' | 'librarian'>('catalog');
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showBorrowModal, setShowBorrowModal] = useState<Book | null>(null);
  const [member1, setMember1] = useState<string>('');
  const [member2, setMember2] = useState<string>('');

  // --- AUTH LOGIC ---

  const handleFinishLogin = (name: string, idStr?: string) => {
    if (!name) return alert("Name is required");
    
    let newUser: User;
    if (selectedRole === 'student') {
      const id = parseInt(idStr || "0");
      if (isNaN(id) || id <= 0) return alert("Valid Student ID (Number) is required");
      newUser = { id: `u_${Date.now()}`, name, role: 'student', studentId: id };
    } else {
      newUser = { id: `u_${Date.now()}`, name, role: 'librarian' };
    }
    
    setCurrentUser(newUser);
    setView(newUser.role === 'librarian' ? 'librarian' : 'catalog');
  };

  const logout = () => {
    setCurrentUser(null);
    setLoginStep('role');
    setSelectedRole(null);
  };

  // --- STUDENT ACTIONS ---

  const initiateBorrow = (book: Book) => {
    if (!currentUser || !currentUser.studentId) return;

    // Policy: One copy per subject
    const hasSubject = issues.find(i => 
      i.studentIds.includes(currentUser.studentId!) && 
      i.subject === book.subject && 
      i.status === 'active'
    );
    if (hasSubject) return alert(`Policy Violation: You already have a book for ${book.subject}.`);

    const m1 = parseInt(member1);
    const m2 = parseInt(member2);

    if (isNaN(m1) || isNaN(m2) || m1 === m2 || m1 === currentUser.studentId || m2 === currentUser.studentId) {
      return alert("Please enter two unique teammate student IDs.");
    }

    const newReq: BorrowRequest = {
      id: `req_${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      initiatorId: currentUser.studentId,
      memberIds: [m1, m2],
      approvals: [],
      status: 'pending',
      timestamp: Date.now()
    };

    setRequests(prev => [...prev, newReq]);
    
    // Notifications for members
    const newNotifs: Notification[] = [
      { id: `n_${Date.now()}_1`, targetId: m1, message: `${currentUser.name} added you to a group borrow for "${book.title}"`, type: 'request', timestamp: Date.now(), requestId: newReq.id },
      { id: `n_${Date.now()}_2`, targetId: m2, message: `${currentUser.name} added you to a group borrow for "${book.title}"`, type: 'request', timestamp: Date.now(), requestId: newReq.id }
    ];
    setNotifications(prev => [...prev, ...newNotifs]);

    setShowBorrowModal(null);
    setMember1('');
    setMember2('');
    alert("Request sent! Teammates must approve in their app.");
  };

  const approveRequest = (reqId: string) => {
    if (!currentUser || !currentUser.studentId) return;
    
    setRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        const newApps = [...new Set([...r.approvals, currentUser.studentId!])];
        const approved = newApps.length === 2; // All members approved
        return { ...r, approvals: newApps, status: approved ? 'approved' : 'pending' };
      }
      return r;
    }));
    setNotifications(prev => prev.filter(n => !(n.requestId === reqId && n.targetId === currentUser.studentId)));
  };

  // --- LIBRARIAN ACTIONS ---

  const issueGroup = (reqId: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    const book = books.find(b => b.id === req.bookId);
    if (!book || book.availableCopies <= 0) return alert("Book out of stock!");

    const newIssue: Issue = {
      id: `iss_${Date.now()}`,
      bookId: req.bookId,
      bookTitle: req.bookTitle,
      subject: book.subject,
      studentIds: [req.initiatorId, ...req.memberIds],
      issueDate: Date.now(),
      dueDate: Date.now() + (BORROW_DAYS * 24 * 60 * 60 * 1000),
      status: 'active'
    };

    setIssues(prev => [...prev, newIssue]);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'issued' } : r));
    setBooks(prev => prev.map(b => b.id === req.bookId ? { ...b, availableCopies: b.availableCopies - 1 } : b));
    alert("Book Issued! Recorded for all 3 members.");
  };

  const finalizeReturn = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'returned', returnDate: Date.now() } : i));
    setBooks(prev => prev.map(b => b.id === issue.bookId ? { ...b, availableCopies: b.availableCopies + 1 } : b));
    alert("Book Returned Successfully.");
  };

  // --- HELPERS ---

  const calculateFine = (issue: Issue) => {
    if (issue.status === 'returned') return 0;
    const now = Date.now();
    if (now <= issue.dueDate) return 0;
    return Math.ceil((now - issue.dueDate) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY;
  };

  const filteredBooks = useMemo(() => 
    books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.subject.toLowerCase().includes(searchQuery.toLowerCase())), 
    [books, searchQuery]
  );

  const myNotifications = useMemo(() => 
    notifications.filter(n => n.targetId === currentUser?.studentId), 
    [notifications, currentUser]
  );

  // --- VIEW RENDERING ---

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-indigo-200 shadow-xl mb-6">
              <BookOpen className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">LibShare</h1>
            <p className="text-slate-500 mt-2 font-medium">Collaborative College Library</p>
          </div>

          {loginStep === 'role' ? (
            <div className="space-y-4">
              <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Choose your Role</p>
              <button 
                onClick={() => { setSelectedRole('student'); setLoginStep('details'); }}
                className="w-full flex items-center gap-4 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 p-6 rounded-3xl transition-all group"
              >
                <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <UserIcon size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">Student</p>
                  <p className="text-xs text-slate-500">Borrow books with teammates</p>
                </div>
              </button>
              <button 
                onClick={() => { setSelectedRole('librarian'); setLoginStep('details'); }}
                className="w-full flex items-center gap-4 bg-slate-50 hover:bg-amber-50 border-2 border-slate-100 hover:border-amber-200 p-6 rounded-3xl transition-all group"
              >
                <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">Librarian</p>
                  <p className="text-xs text-slate-500">Manage issues and returns</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
                <input 
                  id="login-name"
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-600 transition-colors"
                  placeholder="e.g. John Doe"
                />
              </div>
              {selectedRole === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Student ID (Numeric)</label>
                  <input 
                    id="login-id"
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-600 transition-colors"
                    placeholder="e.g. 101"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setLoginStep('role')}
                  className="px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50"
                >
                  Back
                </button>
                <button 
                  onClick={() => handleFinishLogin(
                    (document.getElementById('login-name') as HTMLInputElement).value,
                    (document.getElementById('login-id') as HTMLInputElement)?.value
                  )}
                  className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-0">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <BookOpen className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">LibShare</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {currentUser.role === 'student' ? `ID: ${currentUser.studentId}` : 'Librarian Access'}
            </p>
          </div>
          <button onClick={logout} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {currentUser.role === 'student' ? (
          <>
            {/* View Switcher Mobile */}
            <nav className="flex bg-white p-1 rounded-2xl mb-8 border border-slate-100 shadow-sm overflow-hidden">
              <button onClick={() => setView('catalog')} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${view === 'catalog' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                <Search size={20} /> <span className="text-[10px] font-bold uppercase">Catalog</span>
              </button>
              <button onClick={() => setView('requests')} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all relative ${view === 'requests' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                <Users size={20} /> <span className="text-[10px] font-bold uppercase">Requests</span>
                {myNotifications.length > 0 && <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              <button onClick={() => setView('mybooks')} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${view === 'mybooks' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                <Clock size={20} /> <span className="text-[10px] font-bold uppercase">My Books</span>
              </button>
            </nav>

            {view === 'catalog' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Search by title or subject..."
                    className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-14 pr-6 py-5 shadow-sm outline-none focus:border-indigo-600 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBooks.map(book => (
                    <div key={book.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <BookIcon size={24} />
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${book.availableCopies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {book.availableCopies > 0 ? `${book.availableCopies} Copies Available` : 'Out of Stock'}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-800 leading-tight mb-2">{book.title}</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">{book.author} • <span className="text-indigo-600">{book.subject}</span></p>
                      <button 
                        disabled={book.availableCopies === 0}
                        onClick={() => setShowBorrowModal(book)}
                        className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                          book.availableCopies > 0 
                          ? 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-lg active:scale-95' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Users size={18} /> Group Borrow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'requests' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Action Required</h3>
                {myNotifications.map(notif => (
                  <div key={notif.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="bg-amber-50 p-4 rounded-2xl text-amber-500">
                        <Users size={24} />
                      </div>
                      <p className="font-bold text-slate-700">{notif.message}</p>
                    </div>
                    <button 
                      onClick={() => approveRequest(notif.requestId!)}
                      className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
                    >
                      Confirm Approve
                    </button>
                  </div>
                ))}

                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-10 mb-6">Group Status</h3>
                {requests.filter(r => r.initiatorId === currentUser.studentId || r.memberIds.includes(currentUser.studentId!)).map(req => (
                  <div key={req.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                           <BookIcon size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800">{req.bookTitle}</h4>
                          <p className="text-xs text-slate-400 font-bold uppercase">Requested by ID {req.initiatorId}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 text-sm font-bold">
                        <CheckCircle size={14} /> Initiator (OK)
                      </div>
                      {req.memberIds.map(mid => {
                        const isOk = req.approvals.includes(mid);
                        return (
                          <div key={mid} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${isOk ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                            {isOk ? <CheckCircle size={14} /> : <Clock size={14} />} ID {mid} {isOk ? '(OK)' : '(Pending)'}
                          </div>
                        );
                      })}
                    </div>
                    {req.status === 'approved' && (
                      <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3 text-green-700 text-sm font-medium">
                        <AlertTriangle size={20} className="shrink-0" />
                        <span>Ready! Collect the physical book from the librarian counter as a group.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {view === 'mybooks' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {issues.filter(i => i.studentIds.includes(currentUser.studentId!) && i.status === 'active').map(issue => {
                  const fine = calculateFine(issue);
                  return (
                    <div key={issue.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-10 transition-transform group-hover:scale-110 ${fine > 0 ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                      <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{issue.subject}</p>
                          <h3 className="text-3xl font-extrabold text-slate-800">{issue.bookTitle}</h3>
                        </div>
                        <div className="bg-slate-900 text-white p-5 rounded-3xl text-center min-w-[100px]">
                           <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Due</p>
                           <p className="text-lg font-bold">{new Date(issue.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="bg-white p-3 rounded-2xl shadow-sm text-slate-400">
                               <Users size={20} />
                             </div>
                             <div>
                               <p className="text-xs text-slate-400 font-bold uppercase">Shared with</p>
                               <p className="font-bold text-slate-700">IDs {issue.studentIds.filter(id => id !== currentUser.studentId).join(', ')}</p>
                             </div>
                          </div>
                        </div>
                        <div className={`p-6 rounded-3xl flex items-center justify-between ${fine > 0 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                           <div className="flex items-center gap-4">
                             <div className="bg-white p-3 rounded-2xl shadow-sm">
                               <AlertTriangle size={20} />
                             </div>
                             <div>
                               <p className="text-xs opacity-70 font-bold uppercase">Overdue Fine</p>
                               <p className="text-2xl font-black">₹{fine}</p>
                             </div>
                           </div>
                           {fine > 0 && <span className="font-black text-xs uppercase animate-pulse">Pay Fine at Counter</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {issues.filter(i => i.studentIds.includes(currentUser.studentId!) && i.status === 'active').length === 0 && (
                   <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="text-slate-200" size={40} />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">Your borrowing stack is empty</p>
                      <button onClick={() => setView('catalog')} className="mt-4 text-indigo-600 font-black hover:underline underline-offset-4">Browse Catalog</button>
                   </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Librarian Dashboard */
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
                  <p className="text-xs font-bold uppercase opacity-60 tracking-widest mb-1">Approved Groups</p>
                  <p className="text-4xl font-black">{requests.filter(r => r.status === 'approved').length}</p>
               </div>
               <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Active Issues</p>
                  <p className="text-4xl font-black text-slate-800">{issues.filter(i => i.status === 'active').length}</p>
               </div>
               <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Overdue Loans</p>
                  <p className="text-4xl font-black text-red-500">{issues.filter(i => i.status === 'active' && calculateFine(i) > 0).length}</p>
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 px-2">
                <CheckCircle className="text-green-500" /> Pending Pickup (Verified Groups)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {requests.filter(r => r.status === 'approved').map(req => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-800 mb-1">{req.bookTitle}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase">IDs: {req.initiatorId}, {req.memberIds.join(', ')}</p>
                    </div>
                    <button 
                      onClick={() => issueGroup(req.id)}
                      className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                    >
                      <QrCode size={18} /> Issue
                    </button>
                  </div>
                ))}
                {requests.filter(r => r.status === 'approved').length === 0 && (
                   <div className="col-span-full py-12 text-center bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold">No verified groups waiting for pickup</p>
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 px-2">
                <Clock className="text-indigo-600" /> Active Loans Management
              </h3>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Issue Details</th>
                      <th className="px-8 py-5">Group IDs</th>
                      <th className="px-8 py-5">Fine Status</th>
                      <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {issues.filter(i => i.status === 'active').map(issue => {
                      const fine = calculateFine(issue);
                      return (
                        <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-800">{issue.bookTitle}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Due {new Date(issue.dueDate).toLocaleDateString()}</p>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex gap-1">
                                {issue.studentIds.map(id => (
                                  <span key={id} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">{id}</span>
                                ))}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <span className={`text-sm font-black ${fine > 0 ? 'text-red-500' : 'text-green-500'}`}>
                               {fine > 0 ? `₹${fine}` : 'No Fine'}
                             </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <button 
                               onClick={() => finalizeReturn(issue.id)}
                               className="text-indigo-600 font-black text-xs uppercase hover:underline underline-offset-4"
                             >
                               Mark Returned
                             </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Borrow Request Modal */}
      {showBorrowModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white">
               <div className="flex justify-between items-start mb-6">
                 <div className="bg-indigo-500 p-3 rounded-2xl">
                   <Users size={24} />
                 </div>
                 <button onClick={() => setShowBorrowModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                   <XCircle size={24} />
                 </button>
               </div>
               <h3 className="text-2xl font-black">Group of 3 Rule</h3>
               <p className="text-slate-400 mt-2 text-sm leading-relaxed">To borrow <span className="text-white font-bold">"{showBorrowModal.title}"</span>, you must add 2 other students by their IDs.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700 text-xs font-medium">
                <AlertTriangle size={18} className="shrink-0" />
                <p>Policy: You can't borrow more than one book from the <span className="font-black">"{showBorrowModal.subject}"</span> subject at a time.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teammate 1 ID (e.g. 102)</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-600 transition-all"
                    placeholder="Enter ID"
                    value={member1}
                    onChange={(e) => setMember1(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teammate 2 ID (e.g. 103)</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-indigo-600 transition-all"
                    placeholder="Enter ID"
                    value={member2}
                    onChange={(e) => setMember2(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={() => initiateBorrow(showBorrowModal)}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Send Group Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
