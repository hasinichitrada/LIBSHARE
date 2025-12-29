
export type Role = 'student' | 'librarian';

export interface User {
  id: string; // Internal UUID
  name: string;
  role: Role;
  studentId?: number; // Integer for students
}

export interface Book {
  id: string;
  title: string;
  subject: string;
  author: string;
  totalCopies: number;
  availableCopies: number;
}

export type RequestStatus = 'pending' | 'approved' | 'issued';

export interface BorrowRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  initiatorId: number;
  memberIds: number[]; // Exactly 2 other IDs
  approvals: number[]; // List of studentIds who approved
  status: RequestStatus;
  timestamp: number;
}

export interface Issue {
  id: string;
  bookId: string;
  bookTitle: string;
  subject: string;
  studentIds: number[];
  issueDate: number;
  dueDate: number;
  returnDate?: number;
  status: 'active' | 'returned';
}

export interface Notification {
  id: string;
  targetId: number; // Student ID
  message: string;
  type: 'request' | 'info';
  timestamp: number;
  requestId?: string;
}
