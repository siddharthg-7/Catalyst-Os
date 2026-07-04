import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validateUser(email: string): Promise<any> {
    return { id: 'usr_1', email, name: 'Founder User', role: 'founder' };
  }
}
