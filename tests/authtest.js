/* const request = require('supertest');
const app = require('../seu-arquivo-de-aplicativo'); 
const Login = require('../src/models/login'); 
const bcrypt = require('bcrypt');

describe('POST /login', () => {

  beforeEach(async () => {
    await Login.create({
      username: 'utilizador',
      password: await bcrypt.hash('senhaTeste', 10), 
    });
  });

  test('should return login success with valid credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        username: 'utilizador',
        password: 'senhaTeste',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.message).toBe('login success');
  });


  test('should return user not found with invalid username', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        username: 'utilzadorInexistente',
        password: 'senhaIrrelevante',
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('user not found');
  });


  test('should return invalid credentials with invalid password', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        username: 'utilizador',
        password: 'senhaIncorreta',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('invalid credentials');
  });
});
 */