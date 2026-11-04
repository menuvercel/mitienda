import crypto from 'crypto';

interface SignOptions {
  expiresIn?: string;
}

export function sign(payload: any, secret: string, options?: SignOptions): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  let expiresInSeconds = 86400; // default 24h
  if (options?.expiresIn) {
    if (options.expiresIn.endsWith('h')) {
      expiresInSeconds = parseInt(options.expiresIn, 10) * 3600;
    } else if (options.expiresIn.endsWith('d')) {
      expiresInSeconds = parseInt(options.expiresIn, 10) * 86400;
    } else if (options.expiresIn.endsWith('m')) {
      expiresInSeconds = parseInt(options.expiresIn, 10) * 60;
    } else if (options.expiresIn.endsWith('s')) {
      expiresInSeconds = parseInt(options.expiresIn, 10);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(fullPayload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

  return `${unsigned}.${signature}`;
}

export function verify<T = any>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const unsigned = `${parts[0]}.${parts[1]}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

  const sigBuffer = Buffer.from(parts[2]);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as T & { exp?: number; iat?: number };

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

export default {
  sign,
  verify
};
