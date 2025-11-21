import { io } from "socket.io-client";

// If we are in production (Render), use undefined (auto-detect).
// If we are in development (Localhost), force it to port 3000.
const URL = import.meta.env.PROD ? undefined : 'http://localhost:3000';

export const socket = io(URL);