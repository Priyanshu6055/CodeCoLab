const API_URL =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/projects'
        : '/api/projects';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
};

export const projectsApi = {
    // Create a new project
    create: async ({ title, language, code, roomId }) => {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ title, language, code, roomId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create project');
        return data;
    },

    // Get all user projects (without code)
    getAll: async () => {
        const res = await fetch(API_URL, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch projects');
        return data;
    },

    // Get a single project (with code)
    getOne: async (id) => {
        const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch project');
        return data;
    },

    // Update a project
    update: async (id, updates) => {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update project');
        return data;
    },

    // Delete a project
    delete: async (id) => {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to delete project');
        return data;
    },
};
