import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';

export const login = (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin') {
    const payload = { username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    return res.json({ token });
  }

  return res.status(401).json({ message: 'Credenciales incorrectas' });
};