
# LibShare: Smart Library Sharing App

## 1. App Architecture Overview
- **Frontend**: React 18+ SPA with Tailwind CSS for high-performance, responsive UI.
- **State Management**: React Context/State (simulating Firestore behavior).
- **Service Layer**: Handles simulated Firebase Authentication and Firestore CRUD operations.
- **Real-time Logic**: Polling/Event-driven notification simulation for group approvals.

## 2. Database Schema (Firestore Collections)
- **Users**: `{ id, collegeId, name, role: 'student'|'librarian', email }`
- **Books**: `{ id, title, subject, author, totalCopies, availableCopies }`
- **BorrowRequests**: `{ id, bookId, initiatorId, memberIds[], approvals[], status: 'pending'|'approved'|'issued' }`
- **Issues**: `{ id, requestId, bookId, studentIds[], issueDate, dueDate, returnDate?, status: 'active'|'returned' }`

## 3. User Flow
### Student
1. Login with College ID.
2. Browse catalog; check availability.
3. Initiate Group Borrow (requires 2 peer IDs).
4. Pees receive notifications & approve in their app.
5. Status changes to "Approved" (ready for librarian).
6. Librarian issues book; student sees "My Books" with due date/fine.

### Librarian
1. Login to dashboard.
2. View "Approved Requests" (groups waiting at counter).
3. "Scan" (Simulated) to Issue → book is assigned to all 3 students.
4. "Scan" to Return → updates inventory and stops fine calculation.

## 4. UI Wireframe Description
- **Login**: Minimalist card with role-specific entry.
- **Student Dashboard**: Netflix-style grid of books with availability badges.
- **Request Modal**: Simplified form for teammate IDs.
- **Librarian Dashboard**: High-contrast list view optimized for speed/accuracy.

## 5. Firebase Setup Steps
1. Create project at `console.firebase.google.com`.
2. Enable **Email/Password Authentication**.
3. Create **Cloud Firestore** in test mode.
4. Add collections: `users`, `books`, `requests`, `issues`.
5. Deploy Security Rules: `allow read, write: if request.auth != null;`.

## 6. Sample Test Data
- `STU001` (Arjun), `STU002` (Sneha), `STU003` (Rahul).
- Book: `Data Structures` (Subject: CS).

## 7. 2-Minute Demo Script
- **0:00-0:30**: "Meet Arjun. He needs a DS textbook but the library is out. With LibShare, he searches the catalog, sees 2 copies available, but knows the rule: exactly 3 students must share."
- **0:30-1:00**: "Arjun adds Sneha and Rahul to a request. They both get instant notifications on their phones. Once they tap 'Approve', the request is ready."
- **1:00-1:30**: "At the library counter, Dr. Shanti (Librarian) sees the approved group on her dashboard. One click to 'Issue', and the system tracks all three. No registers, no manual logs."
- **1:30-2:00**: "7 days later, the app alerts all three. If they delay, a ₹5/day fine appears. Returning the book is a simple scan. LibShare makes one book serve 3 times more students."
