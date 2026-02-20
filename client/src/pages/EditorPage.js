import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../constants/Actions';
import Client from '../components/Client';
import CollaborativeEditor from '../components/CollaborativeEditor';
import RunnerPanel from '../components/CodeRunner/RunnerPanel';
import VoicePanel from '../components/VoiceChat/VoicePanel';
import { initSocket } from '../socket/socket';
import { projectsApi } from '../services/projects';
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from 'react-router-dom';
import {
  MdContentCopy,
  MdExitToApp,
  MdFolderOpen,
  MdSave,
  MdTerminal,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdPerson
} from 'react-icons/md';

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef('');
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);

  // Project state
  const [currentProjectId, setCurrentProjectId] = useState(
    location.state?.projectId || null
  );
  const [projectTitle, setProjectTitle] = useState('');
  const [projectLanguage, setProjectLanguage] = useState('javascript');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const autoSaveRef = useRef(null);
  const [showConsole, setShowConsole] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!location.state?.username) return;

    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on('connect_error', handleErrors);
      socketRef.current.on('connect_failed', handleErrors);

      function handleErrors(err) {
        console.error('socket error:', err);
        toast.error('Socket connection failed, try again later.');
        reactNavigator('/');
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state.username,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
      });
    };

    init();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
    };
  }, [location.state, reactNavigator, roomId]);

  // Load project if projectId was passed
  useEffect(() => {
    if (currentProjectId && location.state?.projectId) {
      loadProjectById(currentProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjectById = async (id) => {
    try {
      const project = await projectsApi.getOne(id);
      setProjectTitle(project.title);
      setProjectLanguage(project.language);
      setCurrentProjectId(project._id);
      // The code will be set via the CollaborativeEditor's onCodeReady callback
      // For now, store it so the editor can pick it up
      codeRef.current = project.code || '';
      toast.success(`Loaded: ${project.title}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (autoSave && currentProjectId) {
      autoSaveRef.current = setInterval(async () => {
        try {
          await projectsApi.update(currentProjectId, {
            code: codeRef.current,
          });
          // Subtle indicator, no toast spam
          console.log('Auto-saved at', new Date().toLocaleTimeString());
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, 15000);
    }

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [autoSave, currentProjectId]);

  // Callback from CollaborativeEditor when code changes
  const handleCodeChange = useCallback((code) => {
    codeRef.current = code;
  }, []);

  if (!location.state?.username) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard!');
    } catch {
      toast.error('Failed to copy Room ID');
    }
  };

  const leaveRoom = () => {
    reactNavigator('/');
  };

  // Save current code as new project
  const handleSaveAsNew = async () => {
    if (!projectTitle.trim()) {
      toast.error('Project title is required');
      return;
    }

    setSaving(true);
    const finalLanguage = projectLanguage === 'other' ? customLanguage : projectLanguage;

    if (projectLanguage === 'other' && !customLanguage.trim()) {
      toast.error('Please specify the language');
      setSaving(false);
      return;
    }

    try {
      const project = await projectsApi.create({
        title: projectTitle,
        language: finalLanguage,
        code: codeRef.current,
        roomId,
      });
      setCurrentProjectId(project._id);
      setShowSaveModal(false);
      setCustomLanguage(''); // Reset
      toast.success('Project saved!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Quick save (update existing project)
  const handleQuickSave = async () => {
    if (!currentProjectId) {
      setShowSaveModal(true);
      return;
    }

    setSaving(true);
    try {
      await projectsApi.update(currentProjectId, {
        code: codeRef.current,
        title: projectTitle,
        language: projectLanguage,
      });
      toast.success('Saved!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open load modal
  const handleOpenLoadModal = async () => {
    setShowLoadModal(true);
    setLoadingProjects(true);
    try {
      const data = await projectsApi.getAll();
      setUserProjects(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load a selected project
  const handleLoadProject = async (project) => {
    try {
      const full = await projectsApi.getOne(project._id);
      setCurrentProjectId(full._id);
      setProjectTitle(full.title);
      setProjectLanguage(full.language);
      codeRef.current = full.code || '';
      setShowLoadModal(false);
      toast.success(`Loaded: ${full.title}`);
      // We need to tell the editor to set this code
      // This is handled through the codeRef + a re-render trigger
      window.__loadedProjectCode = full.code || '';
      window.dispatchEvent(new Event('projectLoaded'));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mainWrap">
      <div className={`aside ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <div className="clientsList">
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
              />
            ))}
          </div>
        </div>

        {/* Voice Chat Panel */}
        <VoicePanel
          roomId={roomId}
          username={location.state?.username}
          socketRef={socketRef}
        />

        {/* Project Buttons */}
        <div className="sidebarActions">

          <div className='btnGroup1'>

            <button className="btn iconBtn" onClick={handleQuickSave} title={currentProjectId ? 'Save' : 'Save As'}>
              <MdSave size={20} />
              <span>Save</span>
            </button>

            <button className="btn iconBtn" onClick={handleOpenLoadModal} title="Load Project">
              <MdFolderOpen size={20} />
              <span>Load</span>
            </button>

          </div>

          <div className='btnGroup2'>

            <button className={`btn iconBtn ${showConsole ? 'active' : ''}`} onClick={() => setShowConsole(!showConsole)} title="Toggle Console">
              <MdTerminal size={20} />
              <span>Console</span>
            </button>

            <button className="btn iconBtn" onClick={copyRoomId} title="Copy Room ID">
              <MdContentCopy size={20} />
              <span>Copy ID</span>
            </button>

          </div>

          <button className="btn iconBtn leaveBtn" onClick={leaveRoom} title="Leave Room">
            <MdExitToApp size={20} />
            <span>Leave</span>
          </button>

        </div>
      </div>

      <div className="editorWrap">
        {/* Hamburger Toggle */}
        <button
          className="sidebarToggleBtn"
          onClick={() => setIsSidebarOpen(prev => !prev)}
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          {isSidebarOpen ? <MdKeyboardArrowLeft size={24} /> : <MdKeyboardArrowRight size={24} />}
        </button>

        <div className={`editorMain ${showConsole ? 'withConsole' : ''}`}>
          {/* <CollaborativeEditor
            roomId={roomId}
            username={location.state.username}
            socketRef={socketRef}
            onCodeChange={handleCodeChange}
          /> */}
          <CollaborativeEditor
            roomId={roomId}
            username={location.state.username}
            socketRef={socketRef}
            onCodeChange={handleCodeChange}
          />
        </div>
        {showConsole && (
          <RunnerPanel getCode={() => codeRef.current} />
        )}
      </div>

      {/* Save As Modal */}
      {showSaveModal && (
        <div className="modalOverlay" onClick={() => setShowSaveModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <h3>Save Project</h3>
            <input
              type="text"
              className="inputBox"
              placeholder="Project Title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
            />
            <select
              className="inputBox"
              value={projectLanguage}
              onChange={(e) => setProjectLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="other">Other</option>
            </select>
            {projectLanguage === 'other' && (
              <input
                type="text"
                className="inputBox"
                style={{ marginTop: '10px' }}
                placeholder="Specify Language"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
              />
            )}
            <div className="modalActions">
              <button
                className="btn saveBtn"
                onClick={handleSaveAsNew}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn cancelBtn"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="modalOverlay" onClick={() => setShowLoadModal(false)}>
          <div className="modalContent modalWide" onClick={(e) => e.stopPropagation()}>
            <h3>Load Project</h3>
            {loadingProjects ? (
              <div className="loadingWrapper" style={{ height: '100px' }}>
                <div className="spinner"></div>
              </div>
            ) : userProjects.length === 0 ? (
              <p style={{ color: '#aaa' }}>No saved projects yet.</p>
            ) : (
              <div className="loadProjectList">
                {userProjects.map((p) => (
                  <div
                    key={p._id}
                    className="loadProjectItem"
                    onClick={() => handleLoadProject(p)}
                  >
                    <span className="loadProjectTitle">{p.title}</span>
                    <span className="loadProjectLang">{p.language}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="modalActions">
              <button
                className="btn cancelBtn"
                onClick={() => setShowLoadModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
