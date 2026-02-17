import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import toast from 'react-hot-toast';

const Projects = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteId, setShowDeleteId] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const data = await projectsApi.getAll();
            setProjects(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await projectsApi.delete(id);
            setProjects((prev) => prev.filter((p) => p._id !== id));
            toast.success('Project deleted');
            setShowDeleteId(null);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleOpen = async (project) => {
        // Navigate to editor with project data
        navigate(`/editor/${project.roomId || project._id}`, {
            state: {
                username: user.username,
                projectId: project._id,
            },
        });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <div className="projectsPageWrapper">
            <div className="projectsContainer">
                <div className="projectsHeader">
                    <div className="projectsHeaderLeft">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                        <h2>My Projects</h2>
                    </div>
                    <div className="projectsHeaderRight">
                        <Link to="/" className="btn projectsNavBtn">
                            ← Home
                        </Link>
                        <button className="btn logoutBtn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loadingWrapper" style={{ height: '300px' }}>
                        <div className="spinner"></div>
                        <p>Loading projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="emptyProjects">
                        <h3>No projects yet</h3>
                        <p>
                            Create a room from the{' '}
                            <Link to="/" className="createNewBtn">
                                Home page
                            </Link>{' '}
                            and save your code!
                        </p>
                    </div>
                ) : (
                    <div className="projectsGrid">
                        {projects.map((project) => (
                            <div key={project._id} className="projectCard">
                                <div className="projectCardHeader">
                                    <h3 className="projectTitle">
                                        {project.title}
                                    </h3>
                                    <span className="projectLang">
                                        {project.language}
                                    </span>
                                </div>
                                <div className="projectMeta">
                                    <span>
                                        Updated: {formatDate(project.updatedAt)}
                                    </span>
                                </div>
                                <div className="projectActions">
                                    <button
                                        className="btn projectOpenBtn"
                                        onClick={() => handleOpen(project)}
                                    >
                                        Open
                                    </button>
                                    {showDeleteId === project._id ? (
                                        <div className="deleteConfirm">
                                            <button
                                                className="btn projectDeleteConfirmBtn"
                                                onClick={() =>
                                                    handleDelete(project._id)
                                                }
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                className="btn projectCancelBtn"
                                                onClick={() =>
                                                    setShowDeleteId(null)
                                                }
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn projectDeleteBtn"
                                            onClick={() =>
                                                setShowDeleteId(project._id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Projects;
