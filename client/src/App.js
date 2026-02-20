import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Projects from './pages/Projects';
import { loader } from '@monaco-editor/react';

// Configure Monaco to load from local public/monaco/vs
loader.config({ paths: { vs: '/monaco/vs' } });

function App() {
    return (
        <AuthProvider>
            <div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#4aed88',
                            },
                        },
                    }}
                ></Toaster>
            </div>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />}></Route>
                    <Route path="/signup" element={<Signup />}></Route>
                    <Route
                        path="/projects"
                        element={
                            <PrivateRoute>
                                <Projects />
                            </PrivateRoute>
                        }
                    ></Route>
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Home />
                            </PrivateRoute>
                        }
                    ></Route>
                    <Route
                        path="/editor/:roomId"
                        element={
                            <PrivateRoute>
                                <EditorPage />
                            </PrivateRoute>
                        }
                    ></Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
