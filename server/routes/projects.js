const express = require('express');
const router = express.Router();
const {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
} = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
