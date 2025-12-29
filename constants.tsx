
import { Book, User } from './types';

export const INITIAL_BOOKS: Book[] = [
  { id: 'b1', title: 'Data Structures and Algorithms', subject: 'CS', author: 'N. Karumanchi', totalCopies: 5, availableCopies: 2 },
  { id: 'b2', title: 'Engineering Thermodynamics', subject: 'ME', author: 'P.K. Nag', totalCopies: 3, availableCopies: 3 },
  { id: 'b3', title: 'Organic Chemistry', subject: 'CH', author: 'Morrison Boyd', totalCopies: 2, availableCopies: 1 },
  { id: 'b4', title: 'Microelectronic Circuits', subject: 'EE', author: 'Sedra & Smith', totalCopies: 4, availableCopies: 0 },
];

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Arjun Mehta', role: 'student', studentId: 101 },
  { id: 'u2', name: 'Sneha Rao', role: 'student', studentId: 102 },
  { id: 'u3', name: 'Rahul Varma', role: 'student', studentId: 103 },
];

export const FINE_PER_DAY = 5;
export const BORROW_DAYS = 7;
