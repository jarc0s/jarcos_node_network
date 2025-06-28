// Ejemplo para Next.js con React
import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError, AuthError } from '@jarcos/api-service-library';

// Configurar el cliente API para Next.js
const api = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://jsonplaceholder.typicode.com',
  environment: (process.env.NODE_ENV as any) || 'development',
  auth: {
    enabled: true,
    tokenStorage: 'localStorage',
    autoRefresh: true
  },
  cache: {
    enabled: true,
    defaultTTL: 300000 // 5 minutos
  },
  logging: {
    enabled: process.env.NODE_ENV === 'development',
    level: 'info'
  }
});

// Tipos para la aplicación
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// Hook personalizado para manejo de API
function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (apiCall: () => Promise<{ data: T }>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      setData(response.data);
      return response.data;
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';
      
      if (err instanceof AuthError) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err instanceof ApiError) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

// Hook para manejo de usuarios
function useUsers() {
  const { data: users, loading, error, execute } = useApi<User[]>();

  const fetchUsers = () => execute(() => api.get<User[]>('/users'));
  
  return { users, loading, error, fetchUsers };
}

// Hook para manejo de posts
function usePosts() {
  const { data: posts, loading, error, execute } = useApi<Post[]>();

  const fetchPosts = () => execute(() => api.get<Post[]>('/posts'));
  
  const createPost = (post: Omit<Post, 'id'>) => 
    execute(() => api.post<Post>('/posts', post));

  return { posts, loading, error, fetchPosts, createPost };
}

// Componente de lista de usuarios
const UserList: React.FC = () => {
  const { users, loading, error, fetchUsers } = useUsers();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!users) return null;

  return (
    <div className="user-list">
      <h2>Users ({users.length})</h2>
      <div className="grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.name}</h3>
            <p>Email: {user.email}</p>
            <p>Phone: {user.phone}</p>
            <p>Website: {user.website}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de lista de posts
const PostList: React.FC = () => {
  const { posts, loading, error, fetchPosts } = usePosts();

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) return <div className="loading">Loading posts...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!posts) return null;

  return (
    <div className="post-list">
      <h2>Posts ({posts.length})</h2>
      <div className="posts">
        {posts.slice(0, 10).map(post => (
          <article key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <small>By User {post.userId}</small>
          </article>
        ))}
      </div>
    </div>
  );
};

// Componente para crear posts
const CreatePost: React.FC = () => {
  const { createPost, loading, error } = usePosts();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createPost({
        title,
        body,
        userId: 1
      });
      
      setTitle('');
      setBody('');
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="create-post">
      <h2>Create New Post</h2>
      
      {success && (
        <div className="success">Post created successfully!</div>
      )}
      
      {error && (
        <div className="error">Error: {error}</div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="body">Body:</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={loading}
            rows={4}
          />
        </div>
        
        <button type="submit" disabled={loading || !title || !body}>
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
};

// Componente de estadísticas de la API
const ApiStats: React.FC = () => {
  const [cacheStats, setCacheStats] = useState(api.getCacheStats());
  const [retryStats, setRetryStats] = useState(api.getRetryStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(api.getCacheStats());
      setRetryStats(api.getRetryStats());
    }, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="api-stats">
      <h2>API Statistics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Cache</h3>
          <p>Hits: {cacheStats.hits}</p>
          <p>Misses: {cacheStats.misses}</p>
          <p>Hit Rate: {Math.round(cacheStats.hitRate * 100)}%</p>
          <p>Size: {cacheStats.size} items</p>
        </div>
        
        <div className="stat-card">
          <h3>Retry</h3>
          <p>Total Attempts: {retryStats.totalAttempts}</p>
          <p>Successful: {retryStats.successfulRetries}</p>
          <p>Failed: {retryStats.failedRetries}</p>
        </div>
      </div>
    </div>
  );
};

// Componente principal de la aplicación
const ApiLibraryDemo: React.FC = () => {
  return (
    <div className="app">
      <header>
        <h1>API Service Library - Next.js Demo</h1>
        <p>Demonstrating the API library in a React/Next.js application</p>
      </header>
      
      <main>
        <UserList />
        <PostList />
        <CreatePost />
        <ApiStats />
      </main>
      
      <style jsx>{`
        .app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .user-card, .post-card, .stat-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background: #f9f9f9;
        }
        
        .posts {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin: 20px 0;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: bold;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        button {
          background: #0070f3;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        
        .error {
          background: #fee;
          color: #c00;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #fcc;
          margin: 16px 0;
        }
        
        .success {
          background: #efe;
          color: #060;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #cfc;
          margin: 16px 0;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
};

export default ApiLibraryDemo;