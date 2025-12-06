import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';

@Injectable()
export class RateLimiterService {
  private limiter: Bottleneck;

  constructor() {
    this.limiter = new Bottleneck({
      minTime: 3000, // 2 secondes entre chaque requête
      maxConcurrent: 1, // 1 seule requête à la fois
    });

    // Logs pour monitoring
    this.limiter.on('failed', (error) => {
      console.warn(`⚠️ Rate limiter: Job failed, retrying...`, error.message);
    });

    this.limiter.on('error', (error) => {
      console.error(`❌ Rate limiter error:`, error);
    });
  }

  /**
   * Execute une fonction avec rate limiting
   * @param fn Fonction à exécuter
   * @param timeout Timeout en ms (default: 30000 = 30s)
   */
  async schedule<T>(fn: () => Promise<T>, timeout: number = 30000): Promise<T> {
    return this.limiter.schedule({ expiration: timeout }, fn);
  }

  /**
   * Statistiques de la queue
   */
  getStats() {
    return {
      running: this.limiter.running(),
      queued: this.limiter.queued(),
    };
  }

  /**
   * Vider la queue (utile pour les tests)
   */
  async clear() {
    await this.limiter.stop({ dropWaitingJobs: true });
    this.limiter = new Bottleneck({
      minTime: 2000,
      maxConcurrent: 1,
    });
  }
}
