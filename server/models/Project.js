const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Project title is required'],
            trim: true,
            maxlength: [100, 'Title must be at most 100 characters'],
        },
        language: {
            type: String,
            required: [true, 'Language is required'],
            trim: true,
            default: 'javascript',
        },
        roomId: {
            type: String,
            trim: true,
            default: '',
        },
        code: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

// Index for fast lookup by owner
projectSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
