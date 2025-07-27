// import React from 'react';
// import { useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import CollaborativeEditor from '../components/CollaborativeEditor';
// import Editor from '@monaco-editor/react';

// const EditorPage = () => {
//   const location = useLocation();
//   const { roomId } = useParams();
//   const reactNavigator = useNavigate();

//   // Redirect if no username passed
//   if (!location.state?.username) {
//     return <Navigate to="/" />;
//   }

//   const copyRoomId = async () => {
//     try {
//       await navigator.clipboard.writeText(roomId);
//       toast.success('Room ID copied to clipboard!');
//     } catch {
//       toast.error('Failed to copy Room ID');
//     }
//   };

//   const leaveRoom = () => {
//     reactNavigator('/');
//   };

//   return (
//     <div className="mainWrap">
//       <div className="aside">
//         <div className="asideInner">
//           <div className="logo">
//             <img className="logoImage" src="/code-sync.png" alt="logo" />
//           </div>
//           <h3>Connected</h3>
//           {/* You can implement user list here with Yjs awareness if needed */}
//         </div>
//         <button className="btn copyBtn" onClick={copyRoomId}>
//           Copy ROOM ID
//         </button>
//         <button className="btn leaveBtn" onClick={leaveRoom}>
//           Leave
//         </button>
//       </div>

//       <div className="editorWrap">
//         <CollaborativeEditor
//           roomId={roomId}
//           username={location.state?.username}
//         />
//       </div>
//     </div>
//   );
// };

// export default EditorPage;




import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import CollaborativeEditor from '../components/CollaborativeEditor';
import { initSocket } from '../socket';
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from 'react-router-dom';

const EditorPage = () => {
  const socketRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    // Don't initialize socket if no username is provided
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

      // When someone joins
      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
      });

      // When someone leaves
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
      });
    };

    init();

    // Cleanup
    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
    };
  }, [location.state, reactNavigator, roomId]);

  // Safe redirect after hooks
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

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
              />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        <CollaborativeEditor
          roomId={roomId}
          username={location.state.username}
          socketRef={socketRef}
        />
      </div>
    </div>
  );
};

export default EditorPage;
