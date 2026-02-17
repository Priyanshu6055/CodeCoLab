const Project = require('../models/Project');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
    try {
        const { title, language, code, roomId } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Project title is required' });
        }

        const project = await Project.create({
            owner: req.user._id,
            title,
            language: language || 'javascript',
            code: code || '',
            roomId: roomId || '',
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Server error creating project' });
    }
};

// @desc    Get all projects for logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
    try {
        const projects = await Project.find({ owner: req.user._id })
            .sort({ updatedAt: -1 })
            .select('-code'); // Don't send code in list view

        res.status(200).json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Server error fetching projects' });
    }
};

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only the owner can access
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to access this project' });
        }

        res.status(200).json(project);
    } catch (error) {
        console.error('Get project error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(500).json({ message: 'Server error fetching project' });
    }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this project' });
        }

        const { title, language, code, roomId } = req.body;

        if (title !== undefined) project.title = title;
        if (language !== undefined) project.language = language;
        if (code !== undefined) project.code = code;
        if (roomId !== undefined) project.roomId = roomId;

        const updated = await project.save();
        res.status(200).json(updated);
    } catch (error) {
        console.error('Update project error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(500).json({ message: 'Server error updating project' });
    }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this project' });
        }

        await project.deleteOne();
        res.status(200).json({ message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(500).json({ message: 'Server error deleting project' });
    }
};

module.exports = { createProject, getProjects, getProject, updateProject, deleteProject };
