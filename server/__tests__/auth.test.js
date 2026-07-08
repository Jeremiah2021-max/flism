const request = require('supertest');
const express = require('express');

// Mock the database and other dependencies
jest.mock('../db', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../lib/notifyAdmins', () => ({
  notifyAdmins: jest.fn()
}));

describe('Auth Routes', () => {
  let app;
  
  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Import routes after mocks are set up
    const authRoutes = require('../routes/auth');
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'test123', full_name: 'Test User' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'invalid-email', 
          password: 'test123', 
          full_name: 'Test User' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'test@example.com', 
          password: 'short', 
          full_name: 'Test User' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'invalid-email', 
          password: 'test123' 
        });
      
      expect(response.status).toBe(400);
    });
  });
});
